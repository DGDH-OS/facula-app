import { maakResultaat, valideerVelden } from "./generator";
import {
  dichteLijst,
  eigenSleutels,
  isPlainRecord,
  leesEigen,
  weigerIndienNodig,
} from "./policy";
import { workflowById } from "./registry";
import type {
  AssistentActie,
  AssistentKlaar,
  AssistentUitkomst,
  AssistentWeigering,
  WorkflowId,
} from "./types";

export { WORKFLOWS, workflowById } from "./registry";
export { weigerIndienNodig } from "./policy";
export type {
  AssistentActie,
  AssistentKlaar,
  AssistentUitkomst,
  WorkflowId,
} from "./types";

function onbekend(): AssistentWeigering {
  return {
    soort: "geweigerd",
    code: "onbekend",
    melding:
      "Kies een module via de kaarten. De Assistent herkent geen vrije tekst.",
  };
}

function ongeldigVeld(): AssistentWeigering {
  return {
    soort: "geweigerd",
    code: "ongeldig-veld",
    melding:
      "Je kunt hier geen namen, e-mailadressen of leerlingteksten " +
      "invullen. Kies alleen de vaste opties.",
  };
}

/**
 * Alleen een gekozen module plus vaste enum-velden. Geen vrije tekst,
 * geen trefwoordmatcher. Geeft een voorstel; nog geen actie.
 */
export function voerAssistentUit(
  gekozen?: WorkflowId,
  velden: Record<string, string> = {},
): AssistentUitkomst {
  const workflow = workflowById(gekozen);
  if (!workflow) return onbekend();
  if (!isPlainRecord(velden)) return ongeldigVeld();

  const extra = weigerIndienNodig(
    velden,
    workflow.velden.map((v) => v.id),
  );
  if (extra) return extra;

  const validatie = valideerVelden(workflow.id, velden);
  if (validatie.soort !== "ok") return validatie;
  return maakResultaat(workflow.id, validatie.schoon);
}

function geenBevestiging(melding?: string): AssistentWeigering {
  return {
    soort: "geweigerd",
    code: "geen-bevestiging",
    melding:
      melding ??
      "Er is nog niets gebeurd. Bevestig eerst met Gebruik voorstel.",
  };
}

const KLAAR_SLEUTELS = new Set([
  "soort",
  "workflowId",
  "titel",
  "samenvatting",
  "checklist",
  "waarschuwingen",
  "menselijkeControle",
  "requiresConfirmation",
  "ingevuldeVelden",
]);

function isNonEmptyString(waarde: unknown): waarde is string {
  return typeof waarde === "string" && waarde.trim().length > 0;
}

function dichteStringLijst(waarde: unknown): string[] | null {
  const lijst = dichteLijst(waarde);
  if (!lijst) return null;
  if (!lijst.every((regel) => isNonEmptyString(regel))) return null;
  return lijst as string[];
}

function veldRecordVan(waarde: unknown): Record<string, string> | null {
  if (!isPlainRecord(waarde)) return null;
  const sleutels = eigenSleutels(waarde);
  if (!sleutels) return null;
  const uit: Record<string, string> = {};
  for (const sleutel of sleutels) {
    const gelezen = leesEigen(waarde, sleutel);
    if (!gelezen.ok || typeof gelezen.waarde !== "string") return null;
    uit[sleutel] = gelezen.waarde;
  }
  return uit;
}

function leesVeld(waarde: object, id: string): unknown {
  const gelezen = leesEigen(waarde, id);
  return gelezen.ok ? gelezen.waarde : undefined;
}

type BevestigdKlaar = {
  workflowId: WorkflowId;
  checklist: string[];
};

function snapshotBevestigdKlaar(waarde: unknown): BevestigdKlaar | null {
  if (!isPlainRecord(waarde)) return null;
  const sleutels = eigenSleutels(waarde);
  if (!sleutels) return null;
  for (const sleutel of sleutels) {
    if (!KLAAR_SLEUTELS.has(sleutel)) return null;
  }
  if (leesVeld(waarde, "soort") !== "klaar") return null;
  if (leesVeld(waarde, "requiresConfirmation") !== true) return null;
  if (leesVeld(waarde, "menselijkeControle") !== true) return null;
  const titel = leesVeld(waarde, "titel");
  const samenvatting = leesVeld(waarde, "samenvatting");
  if (!isNonEmptyString(titel)) return null;
  if (!isNonEmptyString(samenvatting)) return null;
  const checklist = dichteStringLijst(leesVeld(waarde, "checklist"));
  if (!checklist || !checklist.length) return null;
  if (!dichteStringLijst(leesVeld(waarde, "waarschuwingen"))) return null;
  const workflow = workflowById(leesVeld(waarde, "workflowId"));
  if (!workflow) return null;
  if (titel !== workflow.titel) return null;
  const velden = veldRecordVan(leesVeld(waarde, "ingevuldeVelden"));
  if (!velden) return null;
  const extra = weigerIndienNodig(
    velden,
    workflow.velden.map((v) => v.id),
  );
  if (extra) return null;
  const validatie = valideerVelden(workflow.id, velden);
  if (validatie.soort !== "ok") return null;
  return { workflowId: workflow.id, checklist };
}

/**
 * Enige adapter die een lokale, omkeerbare actie mag geven.
 * Zonder expliciete bevestiging: weigering, nooit navigatie.
 * Publieke grens: null of kapot voorstel weigert, gooit niet.
 */
export function voerBevestigdeActieUit(
  voorstel: AssistentKlaar,
  bevestigd: boolean,
): AssistentActie | AssistentWeigering {
  if (bevestigd !== true) return geenBevestiging();
  const klaar = snapshotBevestigdKlaar(voorstel);
  if (!klaar) {
    return geenBevestiging(
      "Dit voorstel is niet bevestigbaar. Kies opnieuw een module.",
    );
  }
  const workflow = workflowById(klaar.workflowId);
  if (!workflow) return onbekend();
  return {
    soort: "actie",
    workflowId: klaar.workflowId,
    href: workflow.href,
    label: `Ga naar ${workflow.titel}`,
    checklist: [...klaar.checklist],
  };
}
