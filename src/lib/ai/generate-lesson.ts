import type { GeneratedLesson, LessonInput } from "../types";
import { genereerLes } from "../lesson-generator";
import { mapDraftNaarLes } from "./map";
import { getLessonProviderChain } from "./provider";

/**
 * Totale tijd die het genereren mag kosten, ruim onder de maxDuration van de
 * route (src/app/api/lessons/route.ts) zodat de sjabloon-fallback nog kan
 * draaien voordat het platform de functie afkapt.
 *
 * Gemeten duren: het primaire model doet ongeveer 22 s, het fallback-model
 * ongeveer 50 s. 130 s laat dus beide modellen aan de beurt komen, ook als het
 * eerste blijft hangen tot zijn eigen timeout van 60 s.
 */
const TOTAAL_BUDGET_MS = 130_000;
/** Onder deze resterende tijd is een nieuwe modelaanroep niet meer zinvol. */
const MINIMUM_POGING_MS = 25_000;

export interface LesResultaat {
  les: GeneratedLesson;
  /** Wat er geprobeerd is en wat er misging, voor de serverlog. */
  pogingen: string[];
}

/**
 * Genereert een les via de modelketen en valt terug op de deterministische
 * sjabloongenerator. De keten is: primair model, fallback-model, sjabloon.
 *
 * Deze functie gooit nooit: als alles faalt komt er een sjabloonles uit. De
 * docent wacht al 20 seconden op een resultaat en heeft meer aan een bruikbaar
 * lesskelet dan aan een foutmelding. Wat er misging staat in `pogingen` en gaat
 * naar de serverlog, niet naar de docent.
 */
export async function genereerLesMetAi(input: LessonInput): Promise<LesResultaat> {
  const start = Date.now();
  const pogingen: string[] = [];

  for (const provider of getLessonProviderChain()) {
    const resterend = TOTAAL_BUDGET_MS - (Date.now() - start);
    if (resterend < MINIMUM_POGING_MS) {
      pogingen.push(provider.name + ": overgeslagen, te weinig tijd over");
      break;
    }

    try {
      const draft = await provider.generateLesson(input, { timeoutMs: resterend });
      const les = mapDraftNaarLes(draft, input, provider.model);
      pogingen.push(provider.name + ": gelukt");
      return { les, pogingen };
    } catch (err) {
      pogingen.push(
        provider.name + ": " + (err instanceof Error ? err.message : String(err))
      );
    }
  }

  const les: GeneratedLesson = { ...genereerLes(input), bron: "sjabloon" };
  pogingen.push("sjabloon: gebruikt");
  return { les, pogingen };
}
