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

  const extra = weigerIndienNodig(
    velden,
    workflow.velden.map((v) => v.id),
  );
  if (extra) return extra;

  const validatie = valideerVelden(workflow.id, velden);
  if (validatie.soort !== "ok") return validatie;
  return maakResultaat(workflow.id, validatie.schoon);
}

/**
 * Enige adapter die een lokale, omkeerbare actie mag geven.
 * Zonder expliciete bevestiging: weigering, nooit navigatie.
 */
export function voerBevestigdeActieUit(
  voorstel: AssistentKlaar,
  bevestigd: boolean,
): AssistentActie | AssistentWeigering {
  if (!bevestigd || voorstel.soort !== "klaar") {
    return {
      soort: "geweigerd",
      code: "geen-bevestiging",
      melding:
        "Er is nog niets gebeurd. Bevestig eerst met Gebruik voorstel.",
    };
  }
  if (voorstel.requiresConfirmation !== true) {
    return {
      soort: "geweigerd",
      code: "geen-bevestiging",
      melding: "Dit voorstel is niet bevestigbaar. Kies opnieuw een module.",
    };
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
