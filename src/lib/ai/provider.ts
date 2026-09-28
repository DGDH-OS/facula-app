import type { LessonInput } from "../types";
import type { AiLessonDraft } from "./types";
import { createVertexProvider, STANDAARD_TIMEOUT_MS } from "./vertex";

export interface GenerateOpties {
  /** Hoeveel tijd deze aanroep mag kosten. De route rekent dit uit. */
  timeoutMs?: number;
}

export interface LessonAIProvider {
  /** Naam voor de log, bijvoorbeeld "gemini-3.5-flash@eu". */
  name: string;
  /** Het modelnummer alleen, voor opslag in GeneratedLesson.model. */
  model: string;
  generateLesson(input: LessonInput, opties?: GenerateOpties): Promise<AiLessonDraft>;
}

export type ProviderNaam = "vertex" | "template";

/**
 * De standaardmodellen zijn gekozen op een meting tegen het echte endpoint
 * (28-09-2026, twee lesdelen, beperkt denken), niet op papier:
 *
 *   gemini-2.5-flash  europe-west4   22 s
 *   gemini-2.5-pro    europe-west4   48 tot 53 s, drie van de drie geslaagd
 *   gemini-3.5-flash  eu             43 s eenmalig, vier van de vijf keer
 *                                    boven de 120 s
 *
 * gemini-3.5-flash bestaat voor dit project alleen op de EU-multiregio (op
 * europe-west4 geeft het een 404) en dat endpoint was te traag om een docent
 * op te laten wachten. Het blijft bruikbaar: alle vier de waarden hieronder
 * zijn env-variabelen, dus terugzetten is een configuratiewijziging en geen
 * codewijziging.
 */
const STANDAARD_MODEL = "gemini-2.5-flash";
const STANDAARD_LOCATIE = "europe-west4";
const STANDAARD_FALLBACK_MODEL = "gemini-2.5-pro";
const STANDAARD_FALLBACK_LOCATIE = "europe-west4";

export function providerNaamUitEnv(): ProviderNaam {
  return process.env.FACULA_AI_PROVIDER === "template" ? "template" : "vertex";
}

function projectId(): string | null {
  return process.env.GCP_PROJECT_ID ?? null;
}

function timeoutUitEnv(): number {
  const ruw = Number(process.env.FACULA_AI_TIMEOUT_MS);
  return Number.isFinite(ruw) && ruw > 0 ? ruw : STANDAARD_TIMEOUT_MS;
}

/**
 * Het primaire model, of null als er bewust geen AI gebruikt wordt
 * (FACULA_AI_PROVIDER=template) of als GCP_PROJECT_ID ontbreekt. Null betekent
 * altijd: ga door met de sjabloongenerator, nooit: laat de docent met een fout
 * achter.
 */
export function getLessonProvider(): LessonAIProvider | null {
  if (providerNaamUitEnv() === "template") return null;
  const project = projectId();
  if (!project) return null;

  return createVertexProvider({
    projectId: project,
    model: process.env.FACULA_AI_MODEL || STANDAARD_MODEL,
    location: process.env.FACULA_AI_LOCATION || STANDAARD_LOCATIE,
    timeoutMs: timeoutUitEnv(),
  });
}

/**
 * Het tweede model in de keten: een ander model in een andere regio, zodat een
 * storing of quotum-limiet op het eerste model niet meteen betekent dat de
 * docent een sjabloonles krijgt. Null zodra het gelijk zou zijn aan het
 * primaire model, want dan voegt een tweede poging niets toe.
 */
export function getFallbackLessonProvider(): LessonAIProvider | null {
  if (providerNaamUitEnv() === "template") return null;
  const project = projectId();
  if (!project) return null;

  const model = process.env.FACULA_AI_FALLBACK_MODEL || STANDAARD_FALLBACK_MODEL;
  const location = process.env.FACULA_AI_FALLBACK_LOCATION || STANDAARD_FALLBACK_LOCATIE;
  const primair = getLessonProvider();
  if (primair && primair.name === model + "@" + location) return null;

  return createVertexProvider({
    projectId: project,
    model,
    location,
    timeoutMs: timeoutUitEnv(),
  });
}

/** De volledige keten in de volgorde waarin de route hem afgaat. */
export function getLessonProviderChain(): LessonAIProvider[] {
  return [getLessonProvider(), getFallbackLessonProvider()].filter(
    (p): p is LessonAIProvider => p !== null
  );
}
