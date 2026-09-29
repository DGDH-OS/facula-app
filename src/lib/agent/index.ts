import { maakResultaat, valideerVelden } from "./generator";
import { isPlainRecord, weigerIndienNodig } from "./policy";
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

function isStringLijst(waarde: unknown): waarde is string[] {
  return Array.isArray(waarde) && waarde.every((r) => typeof r === "string");
}

function isVeldRecord(waarde: unknown): waarde is Record<string, string> {
  if (!isPlainRecord(waarde)) return false;
  return Object.values(waarde).every((v) => typeof v === "string");
}

function isBevestigdKlaar(waarde: unknown): waarde is AssistentKlaar {
  if (!isPlainRecord(waarde)) return false;
  for (const sleutel of Object.keys(waarde)) {
    if (!KLAAR_SLEUTELS.has(sleutel)) return false;
  }
  if (waarde.soort !== "klaar") return false;
  if (waarde.requiresConfirmation !== true) return false;
  if (waarde.menselijkeControle !== true) return false;
  if (!isNonEmptyString(waarde.titel)) return false;
  if (!isNonEmptyString(waarde.samenvatting)) return false;
  if (!isStringLijst(waarde.checklist)) return false;
  if (!waarde.checklist.length) return false;
  if (!waarde.checklist.every((regel) => isNonEmptyString(regel))) {
    return false;
  }
  if (!isStringLijst(waarde.waarschuwingen)) return false;
  const workflow = workflowById(waarde.workflowId);
  if (!workflow) return false;
  if (waarde.titel !== workflow.titel) return false;
  if (!isVeldRecord(waarde.ingevuldeVelden)) return false;
  const extra = weigerIndienNodig(
    waarde.ingevuldeVelden,
    workflow.velden.map((v) => v.id),
  );
  if (extra) return false;
  const validatie = valideerVelden(workflow.id, waarde.ingevuldeVelden);
  return validatie.soort === "ok";
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
  if (!isBevestigdKlaar(voorstel)) {
    return geenBevestiging(
      "Dit voorstel is niet bevestigbaar. Kies opnieuw een module.",
    );
  }
  const workflow = workflowById(voorstel.workflowId);
  if (!workflow) return onbekend();
  return {
    soort: "actie",
    workflowId: voorstel.workflowId,
    href: workflow.href,
    label: `Ga naar ${workflow.titel}`,
    checklist: [...voorstel.checklist],
  };
}
