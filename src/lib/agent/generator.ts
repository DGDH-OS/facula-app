import { workflowById } from "./registry";
import type {
  AssistentKlaar,
  AssistentVragen,
  AssistentWeigering,
  WorkflowId,
} from "./types";

function trimVeld(waarde: string | undefined, maxLengte?: number): string {
  const tekst = (waarde ?? "").trim();
  if (maxLengte !== undefined && tekst.length > maxLengte) {
    return tekst.slice(0, maxLengte);
  }
  return tekst;
}

/**
 * Alleen docent-invoer. Geen defaults, geen verzonnen leerdoelen of namen.
 */
export function valideerVelden(
  workflowId: WorkflowId,
  velden: Record<string, string>,
): AssistentVragen | AssistentWeigering | { soort: "ok"; schoon: Record<string, string> } {
  const workflow = workflowById(workflowId);
  const schoon: Record<string, string> = {};
  const ontbrekend: string[] = [];
  const ongeldig: { id: string; melding: string }[] = [];

  for (const veld of workflow.velden) {
    const ruw = trimVeld(velden[veld.id], veld.maxLengte);
    if (!ruw) {
      if (veld.verplicht) ontbrekend.push(veld.id);
      continue;
    }

    if (veld.soort === "keuze") {
      const ok = veld.keuzes?.some((k) => k.waarde === ruw);
      if (!ok) {
        ongeldig.push({
          id: veld.id,
          melding: `${veld.label} is geen toegestane waarde. Kies uit de lijst.`,
        });
        continue;
      }
    }

    if (veld.soort === "getal") {
      if (!/^[0-9]+$/.test(ruw)) {
        ongeldig.push({
          id: veld.id,
          melding: `${veld.label} moet een heel getal zijn.`,
        });
        continue;
      }
      const n = Number(ruw);
      if (veld.min !== undefined && n < veld.min) {
        ongeldig.push({
          id: veld.id,
          melding: `${veld.label} is minimaal ${veld.min}.`,
        });
        continue;
      }
      if (veld.max !== undefined && n > veld.max) {
        ongeldig.push({
          id: veld.id,
          melding: `${veld.label} is maximaal ${veld.max}.`,
        });
        continue;
      }
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
      melding: `Nog invullen: ${labels}. De Assistent vult dit niet zelf in.`,
    };
  }

  return { soort: "ok", schoon };
}

function samenvattingVan(workflowTitel: string, velden: Record<string, string>): string {
  const stukken = Object.entries(velden).map(([id, waarde]) => `${id}: ${waarde}`);
  if (!stukken.length) {
    return `${workflowTitel}. Geen extra velden ingevuld; die horen in de module zelf.`;
  }
  return `${workflowTitel}. Jij vulde in: ${stukken.join("; ")}.`;
}

function checklistVoor(workflowId: WorkflowId, velden: Record<string, string>): string[] {
  const basis: string[] = [];
  if (workflowId === "les") {
    basis.push(`Open de lesgenerator en controleer vak ${velden.vak}, niveau ${velden.niveau}, leerjaar ${velden.leerjaar}.`);
    basis.push("Plak het leerdoel dat jij hier invulde. Verzin geen extra leerlingcontext.");
    basis.push("Genereer de les en lees hem na voordat je hem in de klas gebruikt.");
  } else if (workflowId === "toets") {
    basis.push(`Open de toetsgenerator en controleer vak ${velden.vak}, niveau ${velden.niveau}, leerjaar ${velden.leerjaar}.`);
    basis.push("Plak het leerdoel dat jij hier invulde.");
    basis.push("Controleer vragen en antwoordsleutel zelf. Facula geeft geen cijfers.");
  } else if (workflowId === "rapport") {
    basis.push("Open de rapport-module.");
    basis.push("Gebruik alleen initialen, geen volledige naam.");
    basis.push("Typ je eigen aantekeningen. Voeg geen diagnoses of cijfers toe die je niet zelf noteerde.");
    basis.push("Lees de tekst na. Jij blijft de auteur.");
    if (velden.outputType) basis.push(`Gekozen soort: ${velden.outputType}.`);
    if (velden.vak) basis.push(`Vak om in de module te zetten: ${velden.vak}.`);
  } else if (workflowId === "oudermail" || workflowId === "oudergesprek") {
    basis.push("Open oudercontact.");
    basis.push("Gebruik initialen, geen volledige namen of contactgegevens in vrije tekst als dat niet nodig is.");
    basis.push("Lees het concept na voordat je het verstuurt.");
  } else if (workflowId === "coach") {
    basis.push("Open de coach en stel een vakdidactische vraag.");
    basis.push("Geen leerlingnamen, e-mail of medische termen.");
  } else if (workflowId === "nakijken") {
    basis.push("Open nakijken om de stapel te plannen.");
    basis.push("Vul zelf geen cijfers in via de Assistent; die hoort hier niet.");
  } else {
    basis.push("Open de toetsweek-planner.");
    basis.push("Vul aantallen als hele getallen in. Print niet bij een privacyblokkade.");
  }
  basis.push("Jij blijft eindverantwoordelijk. De Assistent is geen beoordelaar.");
  return basis;
}

export function maakResultaat(
  workflowId: WorkflowId,
  velden: Record<string, string>,
): AssistentKlaar {
  const workflow = workflowById(workflowId);
  const waarschuwingen = [
    "Dit is een voorbereiding, geen automatisch besluit.",
    ...(workflow.privacyWaarschuwing ? [workflow.privacyWaarschuwing] : []),
  ];
  return {
    soort: "klaar",
    workflowId,
    titel: workflow.titel,
    samenvatting: samenvattingVan(workflow.titel, velden),
    checklist: checklistVoor(workflowId, velden),
    volgendeStap: {
      href: workflow.href,
      label: `Ga naar ${workflow.titel}`,
    },
    waarschuwingen,
    menselijkeControle: true,
    ingevuldeVelden: { ...velden },
  };
}
