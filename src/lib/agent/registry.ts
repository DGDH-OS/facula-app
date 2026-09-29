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

const LEERJAREN = [
  { waarde: "1", label: "Leerjaar 1" },
  { waarde: "2", label: "Leerjaar 2" },
  { waarde: "3", label: "Leerjaar 3" },
  { waarde: "4", label: "Leerjaar 4" },
  { waarde: "5", label: "Leerjaar 5" },
  { waarde: "6", label: "Leerjaar 6" },
] as const;

const LEERDOELEN = [
  { waarde: "eu", label: "EU-instellingen uitleggen" },
  { waarde: "industrie", label: "Industriële revolutie uitleggen" },
  { waarde: "vraag-aanbod", label: "Vraag en aanbod uitleggen" },
  { waarde: "verstedelijking", label: "Verstedelijking uitleggen" },
  { waarde: "democratie", label: "Democratie en rechtsstaat uitleggen" },
  { waarde: "klimaat", label: "Klimaat en duurzaamheid uitleggen" },
  { waarde: "bronnen", label: "Bronnen beoordelen" },
  { waarde: "globalisering", label: "Globalisering uitleggen" },
] as const;

const RAPPORT_OUTPUT = [
  { waarde: "rapporttekst", label: "Rapporttekst" },
  { waarde: "oudergesprek", label: "Oudergesprek-verslag" },
  { waarde: "oudermail", label: "Oudermail-concept" },
] as const;

const PRIVACY =
  "Je kunt hier geen namen, e-mailadressen of leerlingteksten invullen.";

const LES_VELDEN = [
  {
    id: "vak",
    label: "Vak",
    soort: "keuze" as const,
    verplicht: true,
    keuzes: VAKKEN,
  },
  {
    id: "niveau",
    label: "Niveau",
    soort: "keuze" as const,
    verplicht: true,
    keuzes: NIVEAUS,
  },
  {
    id: "leerjaar",
    label: "Leerjaar",
    soort: "keuze" as const,
    verplicht: true,
    keuzes: LEERJAREN,
  },
  {
    id: "leerdoel",
    label: "Leerdoel",
    soort: "keuze" as const,
    verplicht: true,
    keuzes: LEERDOELEN,
    hulp: "Alleen deze onderwerpen. Geen vrije tekst.",
  },
];

/**
 * Alleen bestaande modules. Velden zijn vaste keuzes, nooit vrije tekst
 * en nooit leerling-identificerende ids.
 */
export const WORKFLOWS: readonly WorkflowDefinitie[] = [
  {
    id: "les",
    titel: "Les voorbereiden",
    korteUitleg: "Naar de lesgenerator. Alleen vaste keuzes, geen namen.",
    href: "/app/lessons/new",
    velden: LES_VELDEN,
  },
  {
    id: "toets",
    titel: "Toets maken",
    korteUitleg: "Naar de toetsgenerator. Geen cijfers en geen namen.",
    href: "/app/tests/new",
    velden: LES_VELDEN,
  },
  {
    id: "rapport",
    titel: "Rapporttekst voorbereiden",
    korteUitleg: "Naar de rapport-module. Hier geen leerlingtekst.",
    href: "/app/reports/new",
    privacyWaarschuwing: PRIVACY,
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
    korteUitleg: "Naar oudercontact. Hier geen namen of mails.",
    href: "/app/ouders",
    privacyWaarschuwing: PRIVACY,
    velden: [],
  },
  {
    id: "oudergesprek",
    titel: "Oudergesprek voorbereiden",
    korteUitleg: "Naar oudercontact. Het gesprek maak je daar.",
    href: "/app/ouders",
    privacyWaarschuwing: PRIVACY,
    velden: [],
  },
  {
    id: "coach",
    titel: "Vraag aan de coach",
    korteUitleg: "Naar de vakcoach. Alleen vakdidactiek.",
    href: "/app/coach",
    velden: [],
  },
  {
    id: "nakijken",
    titel: "Nakijken plannen",
    korteUitleg: "Naar nakijken. Geen cijfers in dit scherm.",
    href: "/app/nakijken",
    privacyWaarschuwing: PRIVACY,
    velden: [],
  },
  {
    id: "toetsweek",
    titel: "Toetsweek plannen",
    korteUitleg: "Naar de toetsweek-planner.",
    href: "/app/toetsweek",
    velden: [],
  },
];

const BY_ID = Object.fromEntries(WORKFLOWS.map((w) => [w.id, w])) as Record<
  WorkflowId,
  WorkflowDefinitie
>;

export function workflowById(
  id: string | undefined | null,
): WorkflowDefinitie | undefined {
  if (!id) return undefined;
  return BY_ID[id as WorkflowId];
}
