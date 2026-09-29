import { BEKENDE_TITELS, WORKFLOWS } from "./registry";
import type { AssistentKiezen, AssistentWeigering, WorkflowId } from "./types";

function normaliseer(tekst: string): string {
  return tekst.toLowerCase().replaceAll(/[^\p{L}\p{N}\s-]+/gu, " ").replaceAll(/\s+/g, " ").trim();
}

function bevatZin(vraag: string, zin: string): boolean {
  const delen = zin.split(" ").filter(Boolean).map((deel) => deel.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!delen.length) return false;
  return new RegExp(`(?:^|\\s)${delen.join("\\s+")}(?:\\s|$)`, "u").test(vraag);
}

function scoreWorkflow(vraag: string, trefwoorden: readonly string[]): number {
  const n = normaliseer(vraag);
  let score = 0;
  for (const raw of trefwoorden) {
    const woord = normaliseer(raw);
    if (!woord) continue;
    if (bevatZin(n, woord)) score += Math.max(1, woord.split(" ").length);
  }
  return score;
}

export type MatchResult =
  | { soort: "workflow"; workflowId: WorkflowId }
  | AssistentKiezen
  | AssistentWeigering;

/**
 * Deterministische intentie: alleen trefwoorden van bestaande modules.
 * Geen taalmodel, geen gok bij gelijke scores.
 */
export function herkenIntentie(vraag: string): MatchResult {
  const scores = WORKFLOWS.map((w) => ({
    id: w.id,
    score: scoreWorkflow(vraag, w.trefwoorden),
  })).sort((a, b) => b.score - a.score);

  const top = scores[0];
  const tweede = scores[1];
  if (!top || top.score < 1) {
    return {
      soort: "geweigerd",
      code: "onbekend",
      melding: `Dit herken ik niet als een bestaande Facula-module. Kies zelf een van: ${BEKENDE_TITELS}.`,
    };
  }

  if (tweede && tweede.score === top.score) {
    const gelijk = scores.filter((s) => s.score === top.score).map((s) => s.id);
    return {
      soort: "kiezen",
      kandidaten: gelijk,
      melding: "Dit kan bij meer modules horen. Kies welke je bedoelt. De Assistent gokt niet.",
    };
  }

  return { soort: "workflow", workflowId: top.id };
}
