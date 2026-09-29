import { maakResultaat, valideerVelden } from "./generator";
import { weigerIndienNodig } from "./policy";
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

function isPlainVelden(
  velden: unknown,
): velden is Record<string, unknown> {
  return (
    typeof velden === "object" &&
    velden !== null &&
    !Array.isArray(velden)
  );
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
  if (!isPlainVelden(velden)) return ongeldigVeld();

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

function isBevestigdKlaar(waarde: unknown): waarde is AssistentKlaar {
  if (!isPlainVelden(waarde)) return false;
  if (waarde.soort !== "klaar") return false;
  if (waarde.requiresConfirmation !== true) return false;
  if (!Array.isArray(waarde.checklist)) return false;
  if (!waarde.checklist.every((regel) => typeof regel === "string")) {
    return false;
  }
  if (typeof waarde.workflowId !== "string") return false;
  return true;
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
