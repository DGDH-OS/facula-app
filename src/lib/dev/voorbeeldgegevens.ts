import type { RecentItem } from "@/components/app/RecenteLijst";
import type { SchoolLidmaatschap, Verbruik } from "@/lib/school";
import type { LidRij, UitnodigingRij } from "@/components/school/DocentenBeheer";
import type { SectieRij } from "@/components/school/SectiesBeheer";
import type { DelingRij } from "@/components/school/SectieBibliotheek";
import type { DeelbaarItem } from "@/components/school/DeelKiezer";
import type { GeneratedLesson, GeneratedTest } from "@/lib/types";

/**
 * Verzonnen gegevens voor de voorbeeldschermen onder /dev/voorbeeld.
 *
 * Alleen voor schermafbeeldingen tijdens ontwikkelen. Geen echte school, geen
 * echte docent, geen echte leerling: de namen hieronder zijn bedacht en de
 * e-mailadressen staan op een domein dat niet bestaat. Dat is geen detail maar
 * de reden dat dit bestand mag bestaan: een voorbeeldscherm met gegevens van
 * een echte docent zou een gegevenslek zijn met een ander woord ervoor.
 *
 * De tijdstempels zijn relatief aan nu, zodat "3 dagen geleden" ook volgend
 * jaar nog klopt op een schermafbeelding.
 */

function dagenTerug(dagen: number): string {
  return new Date(Date.now() - dagen * 24 * 60 * 60 * 1000).toISOString();
}

export const VOORBEELD_RECENT: RecentItem[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    soort: "les",
    titel: "Je referentiekader stuurt wat je ziet",
    detail: "Maatschappijleer havo 4",
    createdAt: dagenTerug(0),
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    soort: "toets",
    titel: "Toets Maatschappijleer, HAVO 4",
    detail: "10 vragen · havo 4",
    createdAt: dagenTerug(1),
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    soort: "rapport",
    titel: "rapporttekst",
    detail: "zonder naam in dit overzicht",
    createdAt: dagenTerug(3),
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    soort: "les",
    titel: "Van vraag en aanbod naar een prijs",
    detail: "Economie havo 4",
    createdAt: dagenTerug(9),
  },
];

export const VOORBEELD_VERBRUIK: Verbruik = {
  lessons: 7,
  tests: 3,
  reports: 2,
  regime: "school_onbeperkt",
  limiet: null,
  schoolNaam: "Sint Jan College",
};

export const VOORBEELD_LIDMAATSCHAP: SchoolLidmaatschap = {
  schoolId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  schoolNaam: "Sint Jan College",
  rol: "beheerder",
  sectieId: "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1",
  sectieNaam: "Maatschappijleer",
  plan: "pilot",
  pilotTot: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  seatLimit: 8,
  quotaModus: "onbeperkt",
  maandPool: null,
  huisstijlAfdwingen: true,
};

export const VOORBEELD_LEDEN: LidRij[] = [
  {
    userId: "u-1",
    email: "beheerder@voorbeeldschool.invalid",
    rol: "beheerder",
    status: "active",
    sectieId: "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1",
    sectieNaam: "Maatschappijleer",
    lessen: 7,
    toetsen: 3,
    rapporten: 2,
  },
  {
    userId: "u-2",
    email: "m.dekker@voorbeeldschool.invalid",
    rol: "sectievoorzitter",
    status: "active",
    sectieId: "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1",
    sectieNaam: "Maatschappijleer",
    lessen: 12,
    toetsen: 4,
    rapporten: 0,
  },
  {
    userId: "u-3",
    email: "j.visser@voorbeeldschool.invalid",
    rol: "docent",
    status: "active",
    sectieId: "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1",
    sectieNaam: "Economie",
    lessen: 2,
    toetsen: 1,
    rapporten: 1,
  },
];

export const VOORBEELD_SECTIES: SectieRij[] = [
  {
    id: "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1",
    naam: "Maatschappijleer",
    aantalDocenten: 2,
    aantalGedeeld: 3,
  },
  {
    id: "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1",
    naam: "Economie",
    aantalDocenten: 1,
    aantalGedeeld: 1,
  },
];

export const VOORBEELD_UITNODIGINGEN: UitnodigingRij[] = [
  {
    id: "i-1",
    email: "nieuwe.collega@voorbeeldschool.invalid",
    rol: "docent",
    verlooptOp: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const VOORBEELD_DELINGEN: DelingRij[] = [
  {
    id: "d-1",
    soort: "lessons",
    titel: "Je referentiekader stuurt wat je ziet",
    vanMij: false,
    isSectiestandaard: true,
    createdAt: dagenTerug(6),
  },
  {
    id: "d-2",
    soort: "tests",
    titel: "Toets Maatschappijleer, HAVO 4",
    vanMij: true,
    isSectiestandaard: false,
    createdAt: dagenTerug(2),
  },
];

export const VOORBEELD_DEELBAAR: DeelbaarItem[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    soort: "lessons",
    titel: "Je referentiekader stuurt wat je ziet",
    detail: "Maatschappijleer havo 4",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    soort: "tests",
    titel: "Toets Maatschappijleer, HAVO 4",
    detail: "10 vragen · havo 4",
  },
];

/** Een gegenereerde toets, zoals hij op /app/tests/[id] staat. */
export const VOORBEELD_TOETS: GeneratedTest = {
  id: "22222222-2222-4222-8222-222222222222",
  createdAt: dagenTerug(1),
  input: {
    vak: "Maatschappijleer",
    niveau: "havo",
    leerjaar: 4,
    leerdoel:
      "Je kunt uitleggen wat referentiekader, selectieve waarneming en framing betekenen.",
    kernbegrippen: "referentiekader, selectieve waarneming, framing",
    aantalVragen: 3,
  },
  titel: "Toets Maatschappijleer, HAVO 4",
  totaalPunten: 7,
  tijdsduur: 20,
  vragen: [
    {
      nummer: 1,
      type: "meerkeuze",
      vraag: "Welke omschrijving hoort bij het begrip framing?",
      punten: 2,
      opties: [
        { label: "A", tekst: "Het bewust misleiden met onjuiste feiten.", correct: false },
        {
          label: "B",
          tekst:
            "De manier waarop een boodschap wordt ingekleed, zodat het publiek een bepaalde interpretatie krijgt aangereikt.",
          correct: true,
        },
        { label: "C", tekst: "Het uit elkaar groeien van standpunten.", correct: false },
      ],
      antwoordsleutel:
        "B: de manier waarop een boodschap wordt ingekleed, zodat het publiek een bepaalde interpretatie krijgt aangereikt.",
    },
    {
      nummer: 2,
      type: "open",
      vraag:
        "Leg met een voorbeeld uit hoe je referentiekader invloed heeft op wat je in het nieuws opvalt.",
      punten: 3,
      antwoordsleutel:
        "Eigen ervaring en waarden bepalen waar je op let; een voorbeeld waarin twee mensen hetzelfde bericht anders lezen.",
    },
    {
      nummer: 3,
      type: "invulvraag",
      vraag:
        "Het onbewust filteren van informatie die niet bij je beeld past, heet ...",
      punten: 2,
      antwoordsleutel: "selectieve waarneming",
    },
  ],
};

/** Een gegenereerde les, zoals hij op /app/lessons/[id] staat. */
export const VOORBEELD_LES: Omit<GeneratedLesson, "input"> & {
  input: GeneratedLesson["input"];
} = {
  id: "11111111-1111-4111-8111-111111111111",
  createdAt: dagenTerug(0),
  input: {
    vak: "Maatschappijleer",
    niveau: "havo",
    leerjaar: 4,
    leerdoel:
      "Je kunt uitleggen wat de begrippen referentiekader, selectieve waarneming en framing betekenen, en hoe ze samenhangen met maatschappelijke problemen.",
    lesduur: 50,
    aantalLessen: 1,
  },
  titel: "Je referentiekader stuurt wat je ziet",
  kernbegrippen: ["referentiekader", "selectieve waarneming", "framing"],
  onderdelen: [
    {
      nummer: 1,
      titel: "Les 1 van 1",
      duur: 50,
      secties: [
        {
          titel: "1. Terugblik en activering",
          duur: 5,
          inhoud: [
            "Wat las je gisteren in het nieuws?",
            "Waarom viel juist dat je op?",
          ],
        },
        {
          titel: "2. Leerdoel en kernbegrippen",
          duur: 5,
          inhoud: [
            "referentiekader: waarden en ervaring waarmee je kijkt",
            "selectieve waarneming: je filtert wat niet past",
            "framing: hoe een boodschap wordt ingekleed",
          ],
        },
        {
          titel: "3. Casus met cijfers",
          duur: 10,
          inhoud: [
            "68 procent haalt nieuws via social media",
            "31 procent via een traditionele bron",
          ],
        },
      ],
    },
  ],
};
