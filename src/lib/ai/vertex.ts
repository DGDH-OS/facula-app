import { haalAccessToken } from "./auth";
import { bouwUserPrompt, LESSON_RESPONSE_SCHEMA, SYSTEEMINSTRUCTIE } from "./prompt";
import type { AiLessonDraft } from "./types";
import type { LessonAIProvider, GenerateOpties } from "./provider";
import type { LessonInput } from "../types";

/**
 * Vertex AI via de REST-API, met een enkele fetch en zonder SDK-client. Reden:
 * de aanroep is een POST met een JSON-body, dus een extra clientlaag zou alleen
 * gewicht en koudestart kosten. De authenticatie zit in auth.ts.
 *
 * Datalocatie: locatie "eu" gaat naar het EU-endpoint
 * aiplatform.eu.rep.googleapis.com, dat alleen v1beta1 aanbiedt. Een gewone
 * regio (bijvoorbeeld europe-west4) gaat naar het regionale endpoint op v1.
 * Beide combinaties zijn tegen het echte endpoint getest; de v1-variant op het
 * EU-endpoint geeft een 404.
 */

const EU_LOCATIE = "eu";
const EU_HOST = "https://aiplatform.eu.rep.googleapis.com";
/**
 * Standaard-timeout per modelaanroep.
 *
 * Gemeten tegen het echte endpoint (28-09-2026, twee lesdelen): met beperkt
 * denken doet gemini-3.5-flash op het EU-endpoint er 43 s over, en
 * gemini-2.5-pro op europe-west4 46 s. Zonder die beperking liep dezelfde
 * aanvraag meermaals over de 150 s heen. 60 s laat een normale aanroep dus
 * afmaken en kapt een uitschieter af, zodat de volgende schakel in de keten
 * nog aan de beurt komt binnen het budget in generate-lesson.ts.
 */
export const STANDAARD_TIMEOUT_MS = 60_000;
/**
 * Ruim genoeg voor drie lesdelen met docentnotities. Bij Gemini tellen de
 * denk-tokens mee in deze limiet, dus krap zetten levert een afgebroken JSON op
 * in plaats van een korter antwoord.
 */
const MAX_OUTPUT_TOKENS = 32_768;
/** Denkruimte voor de 2.x-modellen, die geen thinkingLevel kennen. */
const DENK_BUDGET_TOKENS = 2_048;

/**
 * Hoeveel het model mag "nadenken" voordat het begint te schrijven.
 *
 * Dit is geen fijnafstemming maar het verschil tussen bruikbaar en onbruikbaar:
 * met de standaardinstelling duurde dezelfde aanvraag meer dan 150 s en viel
 * de docent dus altijd terug op een sjabloonles. De twee modelfamilies vragen
 * er een andere sleutel voor; een 2.5-model antwoordt met HTTP 400
 * "thinking_level is not supported by this model" zodra het de 3.x-vorm krijgt.
 */
function denkInstelling(model: string): Record<string, unknown> {
  const isGemini3 = /^gemini-3/.test(model);
  return isGemini3
    ? { thinkingLevel: "LOW" }
    : { thinkingBudget: DENK_BUDGET_TOKENS };
}

export interface VertexOpties {
  projectId: string;
  model: string;
  location: string;
  timeoutMs?: number;
}

function endpointVoor(opties: VertexOpties): string {
  const isEu = opties.location === EU_LOCATIE;
  const host = isEu ? EU_HOST : "https://" + opties.location + "-aiplatform.googleapis.com";
  const apiVersie = isEu ? "v1beta1" : "v1";
  return (
    host +
    "/" +
    apiVersie +
    "/projects/" +
    opties.projectId +
    "/locations/" +
    opties.location +
    "/publishers/google/models/" +
    opties.model +
    ":generateContent"
  );
}

interface VertexPart {
  text?: string;
  thought?: boolean;
}

interface VertexResponse {
  candidates?: Array<{
    content?: { parts?: VertexPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

/**
 * Plakt de tekstdelen van het antwoord aan elkaar. Denk-delen (thought) horen
 * niet bij de JSON en gaan er hier uit: een reasoning-model levert meerdere
 * parts, en alleen part 0 pakken zou soms leeg zijn.
 */
function pakJsonTekst(data: VertexResponse): string {
  const kandidaat = data.candidates?.[0];
  if (!kandidaat) {
    const reden = data.promptFeedback?.blockReason;
    throw new Error(reden ? "Model gaf geen antwoord, reden: " + reden : "Model gaf geen antwoord.");
  }
  if (kandidaat.finishReason && kandidaat.finishReason !== "STOP") {
    throw new Error("Model stopte met reden " + kandidaat.finishReason + ".");
  }
  const tekst = (kandidaat.content?.parts ?? [])
    .filter((part) => part.thought !== true && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("");
  if (!tekst.trim()) throw new Error("Model gaf een leeg antwoord.");
  return tekst;
}

export function createVertexProvider(opties: VertexOpties): LessonAIProvider {
  return {
    name: opties.model + "@" + opties.location,
    model: opties.model,

    async generateLesson(input: LessonInput, gen?: GenerateOpties): Promise<AiLessonDraft> {
      const timeoutMs = gen?.timeoutMs ?? opties.timeoutMs ?? STANDAARD_TIMEOUT_MS;
      const token = await haalAccessToken();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(endpointVoor(opties), {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEEMINSTRUCTIE }] },
            contents: [{ role: "user", parts: [{ text: bouwUserPrompt(input) }] }],
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              responseMimeType: "application/json",
              responseSchema: LESSON_RESPONSE_SCHEMA,
              thinkingConfig: denkInstelling(opties.model),
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          // Alleen status en een afgekapt stuk body loggen: een foutbody van
          // Google kan de hele request echoën, en die bevat de docentinvoer.
          const body = (await response.text()).slice(0, 300);
          throw new Error("Vertex AI gaf HTTP " + response.status + ": " + body);
        }

        const data = (await response.json()) as VertexResponse;
        return JSON.parse(pakJsonTekst(data)) as AiLessonDraft;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
