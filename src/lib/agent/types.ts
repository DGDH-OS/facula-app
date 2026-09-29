/** Identifiers van bestaande Facula-modules. Geen nieuwe productpaden. */
export type WorkflowId =
  | "les"
  | "toets"
  | "rapport"
  | "oudermail"
  | "oudergesprek"
  | "coach"
  | "nakijken"
  | "toetsweek";

export type VeldSoort = "tekst" | "keuze" | "getal";

export interface AssistentVeld {
  id: string;
  label: string;
  soort: VeldSoort;
  verplicht: boolean;
  keuzes?: readonly { waarde: string; label: string }[];
  min?: number;
  max?: number;
  maxLengte?: number;
  hulp?: string;
}

export interface WorkflowDefinitie {
  id: WorkflowId;
  titel: string;
  korteUitleg: string;
  trefwoorden: readonly string[];
  href: string;
  velden: readonly AssistentVeld[];
  privacyWaarschuwing?: string;
}

export type WeigerCode =
  | "pii"
  | "beoordeling"
  | "overgang"
  | "leerlinggericht"
  | "onbekend"
  | "ontbrekend-veld"
  | "ongeldig-veld";

export interface AssistentWeigering {
  soort: "geweigerd";
  code: WeigerCode;
  melding: string;
}

export interface AssistentKiezen {
  soort: "kiezen";
  kandidaten: WorkflowId[];
  melding: string;
}

export interface AssistentVragen {
  soort: "vragen";
  workflowId: WorkflowId;
  ontbrekendeVelden: string[];
  ongeldigeVelden: { id: string; melding: string }[];
  melding: string;
}

export interface AssistentKlaar {
  soort: "klaar";
  workflowId: WorkflowId;
  titel: string;
  samenvatting: string;
  checklist: string[];
  volgendeStap: { href: string; label: string };
  waarschuwingen: string[];
  /** Altijd true: de docent blijft eindverantwoordelijk. */
  menselijkeControle: true;
  /**
   * Alleen de velden die de docent zelf invulde. Nooit een verzonnen
   * default, nooit een leerlingnaam in een querystring.
   */
  ingevuldeVelden: Record<string, string>;
}

export type AssistentUitkomst =
  | AssistentWeigering
  | AssistentKiezen
  | AssistentVragen
  | AssistentKlaar;
