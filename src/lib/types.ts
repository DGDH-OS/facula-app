export type Vak =
  | "Maatschappijleer"
  | "Geschiedenis"
  | "Economie"
  | "Aardrijkskunde";

export type Niveau = "vmbo-t" | "havo" | "vwo";

export interface LessonInput {
  vak: Vak;
  niveau: Niveau;
  leerjaar: number;
  leerdoel: string;
  lesduur: number; // minuten
  aantalLessen: number;
}

export interface LessonSection {
  titel: string;
  inhoud: string[];
  duur?: number; // minuten, optioneel
}

export interface LessonPart {
  nummer: number;
  titel: string;
  duur: number;
  secties: LessonSection[];
}

export interface GeneratedLesson {
  id: string;
  createdAt: string;
  input: LessonInput;
  titel: string;
  kernbegrippen: string[];
  onderdelen: LessonPart[];
}

export type VraagType = "meerkeuze" | "open" | "invulvraag";

export interface MeerkeuzeOptie {
  label: string;
  tekst: string;
  correct: boolean;
}

export interface ToetsVraag {
  nummer: number;
  type: VraagType;
  vraag: string;
  punten: number;
  opties?: MeerkeuzeOptie[];
  antwoordsleutel: string;
}

export interface TestInput {
  vak: Vak;
  niveau: Niveau;
  leerjaar: number;
  leerdoel: string;
  kernbegrippen: string;
  aantalVragen: number;
}

export interface GeneratedTest {
  id: string;
  createdAt: string;
  input: TestInput;
  titel: string;
  vragen: ToetsVraag[];
  totaalPunten: number;
  tijdsduur: number;
}
