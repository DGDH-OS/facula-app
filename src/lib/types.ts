export const VAKKEN = [
  "Maatschappijleer",
  "Geschiedenis",
  "Economie",
  "Aardrijkskunde",
  "Biologie",
  "Natuurkunde",
  "Scheikunde",
  "Nederlands",
  "Engels",
  "Wiskunde",
] as const;

export type Vak = (typeof VAKKEN)[number];

/** Vakken waarbij een actueel nieuwsartikel als toetsbron past. */
export const VAKKEN_MET_NIEUWSBRON: readonly Vak[] = [
  "Maatschappijleer",
  "Geschiedenis",
  "Economie",
  "Aardrijkskunde",
];

export type Niveau = "vmbo-t" | "havo" | "vwo";

export interface LessonInput {
  vak: Vak;
  niveau: Niveau;
  leerjaar: number;
  leerdoel: string;
  lesduur: number; // minuten
  aantalLessen: number;
  /** Begrippen + definities woordelijk uit het lesboek ("begrip: definitie" per regel). */
  boekBegrippen?: string;
  /** Casus, voorbeeld en opdracht uit het lesboek/eigen materiaal van de docent. */
  casusTekst?: string;
  voorbeeldTekst?: string;
  opdrachtTekst?: string;
}

export interface LessonSection {
  titel: string;
  inhoud: string[];
  duur?: number; // minuten, optioneel
  /** Woordelijk van de docent: nooit inkorten of herschrijven bij export. */
  letterlijk?: boolean;
  /**
   * Toelichting voor de docent, niet voor de slide. Optioneel omdat de
   * sjabloongenerator die niet levert en oudere opgeslagen lessen hem niet
   * hebben. Beide exportroutes kappen `inhoud` af op 7 woorden per bullet
   * (PRESENTATIE-METHODIEK.md); een volledige controlevraag met antwoord
   * hoort daarom hier en niet in `inhoud`.
   */
  docentnotities?: string[];
}

export interface LessonPart {
  nummer: number;
  titel: string;
  duur: number;
  secties: LessonSection[];
  /**
   * De leerdoelen die in dít lesdeel aan bod komen. Optioneel: de
   * sjabloongenerator verdeelt alleen kernbegrippen, de AI-generator
   * verdeelt ook de leerdoelen (1 tot 3 per les).
   */
  leerdoelen?: string[];
}

export interface GeneratedLesson {
  id: string;
  createdAt: string;
  input: LessonInput;
  titel: string;
  kernbegrippen: string[];
  onderdelen: LessonPart[];
  /**
   * Alle leerdoelen die de docent in het vrije tekstveld invoerde, opgesplitst
   * in losse, toetsbare doelen (max 5). Optioneel: bestaande lessen en de
   * sjabloongenerator hebben dit niet.
   */
  leerdoelen?: string[];
  /**
   * Waar de inhoud vandaan komt: `"ai"` (Vertex AI) of `"sjabloon"` (de
   * deterministische genereerLes-fallback). Optioneel zodat oudere
   * opgeslagen lessen geldig blijven.
   */
  bron?: LessonBron;
  /** Het model dat de les schreef, bijv. "gemini-3.5-flash". Alleen bij bron "ai". */
  model?: string;
}

export type LessonBron = "ai" | "sjabloon";

export type VraagType = "meerkeuze" | "open" | "invulvraag";

export interface MeerkeuzeOptie {
  label: string;
  tekst: string;
  correct: boolean;
}

/**
 * Resultaat van de constructive-alignment-check (zie
 * src/lib/constructive-alignment.ts) tussen het leerdoel van de les en deze
 * specifieke toetsvraag. Optioneel omdat oudere/handmatig gebouwde
 * ToetsVraag-objecten dit veld niet hoeven te hebben; een latere sessie kan
 * dit in de UI zichtbaar maken.
 */
export interface AfstemmingResultaat {
  afgestemd: boolean;
  leerdoelNiveau: string;
  toetsvraagNiveau: string;
  waarschuwing?: string;
}

export interface ToetsVraag {
  nummer: number;
  type: VraagType;
  vraag: string;
  punten: number;
  opties?: MeerkeuzeOptie[];
  antwoordsleutel: string;
  /** Nummer van de bron waar deze vraag over gaat (zie GeneratedTest.bronnen). */
  bron?: number;
  /** Constructive-alignment-check t.o.v. het leerdoel (zie hierboven). */
  alignment?: AfstemmingResultaat;
}

export interface TestInput {
  vak: Vak;
  niveau: Niveau;
  leerjaar: number;
  leerdoel: string;
  kernbegrippen: string;
  aantalVragen: number;
  /** Begrippen + definities woordelijk uit het lesboek ("begrip: definitie" per regel). */
  boekBegrippen?: string;
  /** Echt nieuwsartikel van de docent, woordelijk geplakt. Facula zoekt of verzint geen bronnen. */
  bronTekst?: string;
  /** Bronvermelding van dat artikel, bv. "NOS, 12 maart 2026" of een link. */
  bronVermelding?: string;
  /** Vragen uit een voorbeeldtoets van de docent, woordelijk. */
  eigenVragen?: string;
}

export interface ToetsBron {
  nummer: number;
  tekst: string;
  vermelding: string;
}

export interface GeneratedTest {
  id: string;
  createdAt: string;
  input: TestInput;
  titel: string;
  bronnen?: ToetsBron[];
  vragen: ToetsVraag[];
  totaalPunten: number;
  tijdsduur: number;
}

/* ------------------------------------------------------------------ */
/* Module 1 — Rapport & oudercommunicatie                              */
/* LET OP: dit is een andere risicocategorie dan les/toets hierboven — */
/* deze module verwerkt mogelijk leerlinggerelateerde tekst. Zie       */
/* src/lib/avg-guardrails.ts en /privacy/rapport-module.                */
/* ------------------------------------------------------------------ */

export type RapportOutputType = "rapporttekst" | "oudergesprek" | "oudermail";

export type RapportToon = "formeel" | "vriendelijk-direct" | "warm";
export type RapportPeriode = "rapport-1" | "rapport-2" | "rapport-3" | "eindrapport";
export type RapportNiveau = "po" | "vmbo" | "havo" | "vwo";
export type RapportAanspreekvorm = "over-leerling" | "aan-leerling";
export type RapportLengte = "kort" | "normaal" | "uitgebreid";

export interface ReportInput {
  /** Bij voorkeur gepseudonimiseerd, bijv. "L.J." i.p.v. een volledige naam. */
  leerlingLabel: string;
  aantekeningen: string;
  vak?: string;
  waargenomenSterkte?: string;
  aandachtspunt?: string;
  voorbeeldBewijs?: string;
  vervolgstapInDeKlas?: string;
  outputType: RapportOutputType;
  toon: RapportToon;
  periode?: RapportPeriode;
  niveau?: RapportNiveau;
  aanspreekvorm?: RapportAanspreekvorm;
  lengte?: RapportLengte;
}

export interface ReportGuardrailResultaat {
  ok: boolean;
  gevondenWoorden: string[];
}

export interface GeneratedReport {
  id: string;
  createdAt: string;
  input: ReportInput;
  tekst: string;
  guardrail: ReportGuardrailResultaat;
  kwaliteit?: import("./report-quality").ReportQualityResult;
}
