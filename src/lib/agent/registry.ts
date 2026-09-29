import type { WorkflowDefinitie, WorkflowId } from "./types";

const VAKKEN = [
  { waarde: "Maatschappijleer", label: "Maatschappijleer" },
  { waarde: "Geschiedenis", label: "Geschiedenis" },
  { waarde: "Economie", label: "Economie" },
  { waarde: "Aardrijkskunde", label: "Aardrijkskunde" },
] as const;

const NIVEAUS = [
  { waarde: "vmbo-t", label: "vmbo-t" },
  { waarde: "havo", label: "havo" },
  { waarde: "vwo", label: "vwo" },
] as const;

const RAPPORT_OUTPUT = [
  { waarde: "rapporttekst", label: "Rapporttekst" },
  { waarde: "oudergesprek", label: "Oudergesprek-verslag" },
  { waarde: "oudermail", label: "Oudermail-concept" },
] as const;

/**
 * Alleen bestaande modules. Velden komen uit de bestaande schema's
 * (LessonInput, TestInput, ReportInput). Geen extra velden, geen
 * leerlingnamen in dit register.
 */
export const WORKFLOWS: readonly WorkflowDefinitie[] = [
  {
    id: "les",
    titel: "Les voorbereiden",
    korteUitleg: "Naar de lesgenerator. Jij vult het leerdoel in; Facula verzint geen leerlinggegevens.",
    trefwoorden: ["les", "lesvoorbereiding", "lesmateriaal", "powerpoint", "ppt"],
    href: "/app/lessons/new",
    velden: [
      {
        id: "vak",
        label: "Vak",
        soort: "keuze",
        verplicht: true,
        keuzes: VAKKEN,
      },
      {
        id: "niveau",
        label: "Niveau",
        soort: "keuze",
        verplicht: true,
        keuzes: NIVEAUS,
      },
      {
        id: "leerjaar",
        label: "Leerjaar",
        soort: "getal",
        verplicht: true,
        min: 1,
        max: 6,
      },
      {
        id: "leerdoel",
        label: "Leerdoel",
        soort: "tekst",
        verplicht: true,
        maxLengte: 2000,
        hulp: "In jouw woorden. Geen leerlingnamen.",
      },
    ],
  },
  {
    id: "toets",
    titel: "Toets maken",
    korteUitleg: "Naar de toetsgenerator. Alleen leerdoel en instellingen, geen cijfers of namen.",
    trefwoorden: ["toets", "toetsvragen", "proefwerk", "so ", "schriftelijke overhoring"],
    href: "/app/tests/new",
    velden: [
      {
        id: "vak",
        label: "Vak",
        soort: "keuze",
        verplicht: true,
        keuzes: VAKKEN,
      },
      {
        id: "niveau",
        label: "Niveau",
        soort: "keuze",
        verplicht: true,
        keuzes: NIVEAUS,
      },
      {
        id: "leerjaar",
        label: "Leerjaar",
        soort: "getal",
        verplicht: true,
        min: 1,
        max: 6,
      },
      {
        id: "leerdoel",
        label: "Leerdoel",
        soort: "tekst",
        verplicht: true,
        maxLengte: 2000,
        hulp: "Wat moet de toets toetsen? Geen leerlingnamen.",
      },
    ],
  },
  {
    id: "rapport",
    titel: "Rapporttekst voorbereiden",
    korteUitleg: "Naar de rapport-module. Initialen vul je daar zelf in, niet hier.",
    trefwoorden: ["rapport", "rapporttekst", "rapportage"],
    href: "/app/reports/new",
    privacyWaarschuwing:
      "Typ hier geen namen, cijfers of diagnoses. In de rapport-module gebruik je alleen initialen.",
    velden: [
      {
        id: "outputType",
        label: "Soort tekst",
        soort: "keuze",
        verplicht: true,
        keuzes: RAPPORT_OUTPUT,
      },
      {
        id: "vak",
        label: "Vak (optioneel)",
        soort: "keuze",
        verplicht: false,
        keuzes: VAKKEN,
      },
    ],
  },
  {
    id: "oudermail",
    titel: "Oudermail voorbereiden",
    korteUitleg: "Naar oudercontact. Geen namen in dit scherm.",
    trefwoorden: ["oudermail", "mail naar ouders", "ouderbericht"],
    href: "/app/ouders",
    privacyWaarschuwing:
      "Geen leerlingnamen of contactgegevens in dit scherm. Die horen in de oudercontact-module, met initialen.",
    velden: [],
  },
  {
    id: "oudergesprek",
    titel: "Oudergesprek voorbereiden",
    korteUitleg: "Naar oudercontact. Het gesprek bereid je daar voor.",
    trefwoorden: ["oudergesprek", "10-minutengesprek", "ouderavond"],
    href: "/app/ouders",
    privacyWaarschuwing:
      "Geen leerlingnamen in dit scherm. Bereid het gesprek voor in de oudercontact-module.",
    velden: [],
  },
  {
    id: "coach",
    titel: "Vraag aan de coach",
    korteUitleg: "Naar de vakcoach. Alleen vakdidactiek, geen leerlingdossiers.",
    trefwoorden: ["coach", "vakdidactiek", "lesidee vragen"],
    href: "/app/coach",
    velden: [],
  },
  {
    id: "nakijken",
    titel: "Nakijken plannen",
    korteUitleg: "Naar nakijken. Geen cijfers of namen in dit scherm.",
    trefwoorden: ["nakijken", "nakijkstapel", "werkdruk nakijken"],
    href: "/app/nakijken",
    privacyWaarschuwing:
      "De Assistent geeft geen cijfers en beoordeelt geen werk. Dat doe jij in de nakijk-module.",
    velden: [],
  },
  {
    id: "toetsweek",
    titel: "Toetsweek plannen",
    korteUitleg: "Naar de toetsweek-planner.",
    trefwoorden: ["toetsweek", "toetsperiode", "toetsrooster"],
    href: "/app/toetsweek",
    velden: [],
  },
];

const BY_ID = Object.fromEntries(WORKFLOWS.map((w) => [w.id, w])) as Record<
  WorkflowId,
  WorkflowDefinitie
>;

export function workflowById(id: WorkflowId): WorkflowDefinitie {
  return BY_ID[id];
}

export const BEKENDE_TITELS = WORKFLOWS.map((w) => w.titel).join(", ");
