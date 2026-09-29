import { workflowById } from "./registry";
import type {
  AssistentKlaar,
  AssistentVragen,
  AssistentWeigering,
  WorkflowDefinitie,
  WorkflowId,
} from "./types";

function labelVan(
  workflow: WorkflowDefinitie,
  id: string,
  waarde: string,
): string {
  const veld = workflow.velden.find((v) => v.id === id);
  const keuze = veld?.keuzes.find((k) => k.waarde === waarde);
  return `${veld?.label ?? id}: ${keuze?.label ?? waarde}`;
}

/**
 * Alleen vaste keuzes. Geen defaults, geen vrije tekst, geen namen.
 */
function eigenWaarde(
  velden: Record<string, unknown>,
  id: string,
): unknown {
  if (!Object.prototype.hasOwnProperty.call(velden, id)) return undefined;
  return velden[id];
}

export function valideerVelden(
  workflowId: WorkflowId,
  velden: Record<string, unknown>,
):
  | AssistentVragen
  | AssistentWeigering
  | { soort: "ok"; schoon: Record<string, string> } {
  const workflow = workflowById(workflowId);
  if (!workflow) {
    return {
      soort: "geweigerd",
      code: "onbekend",
      melding: "Deze module ken ik niet. Kies een kaart op dit scherm.",
    };
  }

  const schoon: Record<string, string> = {};
  const ontbrekend: string[] = [];
  const ongeldig: { id: string; melding: string }[] = [];

  for (const veld of workflow.velden) {
    const bron = eigenWaarde(velden, veld.id);
    if (bron === undefined || bron === "") {
      if (veld.verplicht) ontbrekend.push(veld.id);
      continue;
    }
    if (typeof bron !== "string") {
      ongeldig.push({
        id: veld.id,
        melding: `${veld.label} is geen toegestane waarde. Kies uit de lijst.`,
      });
      continue;
    }
    const ruw = bron.trim();
    if (!ruw) {
      if (veld.verplicht) ontbrekend.push(veld.id);
      continue;
    }

    const ok = veld.keuzes.some((k) => k.waarde === ruw);
    if (!ok) {
      ongeldig.push({
        id: veld.id,
        melding: `${veld.label} is geen toegestane waarde. Kies uit de lijst.`,
      });
      continue;
    }

    schoon[veld.id] = ruw;
  }

  if (ongeldig.length) {
    return {
      soort: "vragen",
      workflowId,
      ontbrekendeVelden: ontbrekend,
      ongeldigeVelden: ongeldig,
      melding: ongeldig.map((f) => f.melding).join(" "),
    };
  }

  if (ontbrekend.length) {
    const labels = ontbrekend
      .map((id) => workflow.velden.find((v) => v.id === id)?.label ?? id)
      .join(", ");
    return {
      soort: "vragen",
      workflowId,
      ontbrekendeVelden: ontbrekend,
      ongeldigeVelden: [],
      melding: `Nog kiezen: ${labels}. De Assistent vult dit niet zelf in.`,
    };
  }

  return { soort: "ok", schoon };
}

function samenvattingVan(
  workflow: WorkflowDefinitie,
  velden: Record<string, string>,
): string {
  const stukken = Object.entries(velden).map(([id, waarde]) =>
    labelVan(workflow, id, waarde),
  );
  if (!stukken.length) {
    return `${workflow.titel}. Geen extra keuzes; die horen in de module.`;
  }
  return `${workflow.titel}. Jij koos: ${stukken.join("; ")}.`;
}

function checklistVoor(
  workflow: WorkflowDefinitie,
  velden: Record<string, string>,
): string[] {
  const id = workflow.id;
  const basis: string[] = [];
  if (id === "les") {
    basis.push("Open de lesgenerator.");
    basis.push("Zet vak, niveau en leerjaar gelijk aan jouw keuze.");
    basis.push("Gebruik het gekozen leerdoel. Verzin geen leerlingcontext.");
    basis.push("Genereer de les en lees hem na voor gebruik in de klas.");
  } else if (id === "toets") {
    basis.push("Open de toetsgenerator.");
    basis.push("Zet vak, niveau en leerjaar gelijk aan jouw keuze.");
    basis.push("Gebruik het gekozen leerdoel.");
    basis.push("Controleer vragen zelf. Facula geeft geen cijfers.");
  } else if (id === "rapport") {
    basis.push("Open de rapport-module.");
    basis.push("Vul daar zelf in wat bij die module hoort.");
    basis.push("Lees de tekst na. Jij blijft de auteur.");
    if (velden.outputType) {
      basis.push(`Gekozen soort: ${labelVan(workflow, "outputType", velden.outputType)}.`);
    }
    if (velden.vak) {
      basis.push(`Vak: ${labelVan(workflow, "vak", velden.vak)}.`);
    }
  } else if (id === "oudermail" || id === "oudergesprek") {
    basis.push("Open oudercontact.");
    basis.push("Maak het concept daar. Verstuur niets vanuit de Assistent.");
  } else if (id === "coach") {
    basis.push("Open de coach voor een vakdidactische vraag.");
    basis.push("Geen leerlingtekst in de Assistent.");
  } else if (id === "nakijken") {
    basis.push("Open nakijken om de stapel te plannen.");
    basis.push("De Assistent geeft geen cijfers.");
  } else {
    basis.push("Open de toetsweek-planner.");
    basis.push("Plan daar. De Assistent bewaart of print niets.");
  }
  basis.push("Jij blijft eindverantwoordelijk. De Assistent beoordeelt niet.");
  return basis;
}

export function maakResultaat(
  workflowId: WorkflowId,
  velden: Record<string, string>,
): AssistentKlaar | AssistentWeigering {
  const workflow = workflowById(workflowId);
  if (!workflow) {
    return {
      soort: "geweigerd",
      code: "onbekend",
      melding: "Deze module ken ik niet. Kies een kaart op dit scherm.",
    };
  }
  const waarschuwingen = [
    "Dit is een voorstel. Er is nog niets gebeurd.",
    ...(workflow.privacyWaarschuwing ? [workflow.privacyWaarschuwing] : []),
  ];
  return {
    soort: "klaar",
    workflowId,
    titel: workflow.titel,
    samenvatting: samenvattingVan(workflow, velden),
    checklist: checklistVoor(workflow, velden),
    waarschuwingen,
    menselijkeControle: true,
    requiresConfirmation: true,
    ingevuldeVelden: { ...velden },
  };
}
