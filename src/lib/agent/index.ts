import { maakResultaat, valideerVelden } from "./generator";
import { herkenIntentie } from "./matcher";
import { weigerIndienNodig } from "./policy";
import { workflowById } from "./registry";
import type { AssistentUitkomst, WorkflowId } from "./types";

export { WORKFLOWS, workflowById } from "./registry";
export { herkenIntentie } from "./matcher";
export { weigerIndienNodig } from "./policy";
export type { AssistentUitkomst, WorkflowId } from "./types";

function piiInVelden(velden: Record<string, string>) {
  return Object.values(velden).join("\n");
}

/**
 * Enige publieke ingang van de Assistent. Deterministisch: weigeren,
 * laten kiezen, velden vragen, of een checklist naar een bestaande module.
 * Geen queryparams met leerlinggegevens, geen localStorage.
 */
export function voerAssistentUit(
  vraag: string,
  velden: Record<string, string> = {},
  gekozen?: WorkflowId,
): AssistentUitkomst {
  const weigering =
    weigerIndienNodig(vraag) ?? weigerIndienNodig(piiInVelden(velden));
  if (weigering) return weigering;

  let workflowId = gekozen;
  if (!workflowId) {
    if (!vraag.trim()) {
      return {
        soort: "geweigerd",
        code: "onbekend",
        melding:
          "Typ wat je wilt maken, of kies een module. De Assistent verzint niets als de vraag leeg is.",
      };
    }
    const match = herkenIntentie(vraag);
    if (match.soort !== "workflow") return match;
    workflowId = match.workflowId;
  } else {
    workflowById(workflowId);
  }

  const validatie = valideerVelden(workflowId, velden);
  if (validatie.soort !== "ok") return validatie;
  return maakResultaat(workflowId, validatie.schoon);
}
