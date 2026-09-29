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

export type VeldSoort = "keuze";

export interface AssistentVeld {
  id: string;
  label: string;
  soort: VeldSoort;
  verplicht: boolean;
  keuzes: readonly { waarde: string; label: string }[];
  hulp?: string;
}

export interface WorkflowDefinitie {
  id: WorkflowId;
  titel: string;
  korteUitleg: string;
  href: string;
  velden: readonly AssistentVeld[];
  privacyWaarschuwing?: string;
}

export type WeigerCode =
  | "onbekend"
  | "ontbrekend-veld"
  | "ongeldig-veld"
  | "geen-bevestiging";

export interface AssistentWeigering {
  soort: "geweigerd";
  code: WeigerCode;
  melding: string;
}

export interface AssistentVragen {
  soort: "vragen";
  workflowId: WorkflowId;
  ontbrekendeVelden: string[];
  ongeldigeVelden: { id: string; melding: string }[];
  melding: string;
}

/**
 * Voorstel na geldige keuzes. Nog geen actie: de docent moet apart
 * bevestigen voordat er lokaal genavigeerd mag worden.
 */
export interface AssistentKlaar {
  soort: "klaar";
  workflowId: WorkflowId;
  titel: string;
  samenvatting: string;
  checklist: string[];
  waarschuwingen: string[];
  menselijkeControle: true;
  requiresConfirmation: true;
  ingevuldeVelden: Record<string, string>;
}

/** Pas na aparte bevestiging. Alleen lokale navigatie (href). */
export interface AssistentActie {
  soort: "actie";
  workflowId: WorkflowId;
  href: string;
  label: string;
  checklist: string[];
}

export type AssistentUitkomst =
  | AssistentWeigering
  | AssistentVragen
  | AssistentKlaar;
