import type {
  ReportInput,
  RapportOutputType,
  RapportToon,
  GeneratedReport,
} from "./types";
import { controleerOutputTegenInvoer } from "./avg-guardrails";
import { controleerRapportKwaliteit } from "./report-quality";

/* ------------------------------------------------------------------ */
/* Rapport- & oudercommunicatie-generator                               */
/*                                                                      */
/* Zelfde patroon als lesson-generator.ts: sjabloon-gebaseerde tekst-  */
/* samenstelling op basis van trefwoord-herkenning, GEEN externe LLM.  */
/* GEEN cijfer/oordeel wordt hier ooit toegevoegd — de generator       */
/* herformuleert uitsluitend wat de docent zelf als aantekening        */
/* invoerde. Zie avg-guardrails.ts voor de harde controle daarop.      */
/* ------------------------------------------------------------------ */

/**
 * Trefwoorden waarmee losse aantekening-fragmenten worden ingedeeld in
 * "gaat goed" versus "aandachtspunt", puur om de tekst logisch te
 * groeperen — de fragmenten zelf worden verbatim (of licht opgeschoond)
 * overgenomen, nooit herschreven naar een oordeel.
 */
const POSITIEVE_TREFWOORDEN = [
  "goed mee",
  "sterk",
  "sterke",
  "gemotiveerd",
  "actief",
  "behulpzaam",
  "enthousiast",
  "vooruitgang",
  "verbeterd",
  "zelfstandig",
  "goed samen",
  "positieve",
  "positief",
];

const AANDACHTSPUNT_TREFWOORDEN = [
  "moeite met",
  "niet af",
  "te laat",
  "vergeet",
  "afwezig",
  "afgeleid",
  "onrustig",
  "lastig",
  "mist",
  "ontbreekt",
  "niet ingeleverd",
  "moeilijk",
];

function splitsAantekeningen(aantekeningen: string): string[] {
  return aantekeningen
    .split(/[,;\n]|(?:\s+en\s+)/gi)
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => f.replace(/^en\s+/i, "").trim())
    .filter(Boolean);
}

function isPositief(fragment: string): boolean {
  const f = fragment.toLowerCase();
  return POSITIEVE_TREFWOORDEN.some((w) => f.includes(w));
}

function isAandachtspunt(fragment: string): boolean {
  const f = fragment.toLowerCase();
  return AANDACHTSPUNT_TREFWOORDEN.some((w) => f.includes(w));
}

interface Ingedeeld {
  positief: string[];
  aandacht: string[];
  overig: string[];
}

function deelIn(aantekeningen: string): Ingedeeld {
  const fragmenten = splitsAantekeningen(aantekeningen);
  const positief: string[] = [];
  const aandacht: string[] = [];
  const overig: string[] = [];

  for (const f of fragmenten) {
    if (isPositief(f)) positief.push(f);
    else if (isAandachtspunt(f)) aandacht.push(f);
    else overig.push(f);
  }

  return { positief, aandacht, overig };
}

/** Zet een los fragment om in een leesbare zin-onderdeel (kleine letter). */
function alsZinsdeel(fragment: string): string {
  return fragment.charAt(0).toLowerCase() + fragment.slice(1);
}

function opsomming(fragmenten: string[]): string {
  const delen = fragmenten.map(alsZinsdeel);
  if (delen.length === 0) return "";
  if (delen.length === 1) return delen[0];
  return `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;
}

/* ------------------------------------------------------------------ */
/* Toon-woordenboek — alleen connectieve, NIET-evaluatieve taal.       */
/* Geen van deze zinsneden bevat een cijfer, kwalificatie of advies    */
/* over overgaan/zakken.                                               */
/* ------------------------------------------------------------------ */

interface ToonWoorden {
  aanhef: (label: string) => string;
  positiefIntro: string;
  aandachtIntro: string;
  afsluiting: string;
}

const TOON_WOORDEN: Record<RapportToon, ToonWoorden> = {
  formeel: {
    aanhef: (label) => `Betreffende ${label}:`,
    positiefIntro: "Wat opvalt in de afgelopen periode is dat",
    aandachtIntro: "Daarnaast valt op dat",
    afsluiting:
      "Bovenstaande is een feitelijke weergave van waargenomen gedrag en werkhouding, bedoeld als aanvulling op het reguliere overleg.",
  },
  "vriendelijk-direct": {
    aanhef: (label) => `Over ${label}:`,
    positiefIntro: "Het valt op dat",
    aandachtIntro: "Een aandachtspunt is dat",
    afsluiting:
      "Dit is een korte, feitelijke samenvatting, fijn om samen op te pakken waar nodig.",
  },
  warm: {
    aanhef: (label) => `Even over ${label}:`,
    positiefIntro: "Het is fijn om te zien dat",
    aandachtIntro: "Wel is het goed om te benoemen dat",
    afsluiting:
      "Deze tekst is bedoeld als een warme, eerlijke terugkoppeling op wat is waargenomen.",
  },
};

/* ------------------------------------------------------------------ */
/* Kernparagraaf — gedeeld door alle output-typen                       */
/* ------------------------------------------------------------------ */

function bouwKernParagraaf(input: ReportInput, woorden: ToonWoorden): string {
  const bron = [input.aantekeningen, input.waargenomenSterkte, input.aandachtspunt, input.voorbeeldBewijs, input.vervolgstapInDeKlas].filter(Boolean).join("; ");
  const { positief, aandacht, overig } = deelIn(bron);
  const zinnen: string[] = [];

  if (positief.length > 0) {
    zinnen.push(`${woorden.positiefIntro} ${opsomming(positief)}.`);
  }
  if (aandacht.length > 0) {
    zinnen.push(`${woorden.aandachtIntro} ${opsomming(aandacht)}.`);
  }
  if (overig.length > 0) {
    zinnen.push(`Verder is genoteerd: ${opsomming(overig)}.`);
  }
  if (zinnen.length === 0) {
    zinnen.push(
      "Er zijn aantekeningen genoteerd; vul de losse steekwoorden verder aan voor een vollediger beeld."
    );
  }

  return zinnen.join(" ");
}

/* ------------------------------------------------------------------ */
/* Per output-type: rapporttekst / oudergesprek / oudermail             */
/* ------------------------------------------------------------------ */

function bouwRapporttekst(input: ReportInput, woorden: ToonWoorden): string {
  const kern = bouwKernParagraaf(input, woorden);
  const positief = deelIn(input.aantekeningen).positief;
  const opening = input.aanspreekvorm === "aan-leerling"
    ? `Je hebt deze periode laten zien dat ${opsomming(positief) || "je inzet toont"}.`
    : `${input.leerlingLabel} heeft deze periode laten zien dat ${opsomming(positief) || "er inzet is"}.`;
  const afsluiting = input.aanspreekvorm === "aan-leerling" ? "Blijf deze aanpak gebruiken; zo zet je een mooie volgende stap." : `${input.leerlingLabel} kan deze ontwikkeling de komende periode verder voortzetten.`;
  const vakPeriode = [input.vak, input.periode].filter(Boolean).join(" - ");
  return [woorden.aanhef(vakPeriode || input.leerlingLabel), opening, kern, afsluiting].join(
    "\n\n"
  );
}

function bouwOudergesprek(input: ReportInput, woorden: ToonWoorden): string {
  void woorden;
  const { positief, aandacht, overig } = deelIn([input.aantekeningen, input.waargenomenSterkte, input.aandachtspunt, input.voorbeeldBewijs, input.vervolgstapInDeKlas].filter(Boolean).join("; "));
  const kop = `Oudergesprek over ${input.leerlingLabel}`;
  const sterkte = opsomming(positief) || input.waargenomenSterkte || opsomming(overig) || "Zie de genoteerde observaties.";
  const punt = opsomming(aandacht) || input.aandachtspunt || "Bespreek dit aandachtspunt samen.";
  const stap = input.vervolgstapInDeKlas || "Spreek een kleine vervolgstap in de klas af.";
  return [
    kop,
    `• Sterkte: ${sterkte}`,
    `• Aandacht: ${punt}`,
    `• Vervolgstap: ${stap}`,
    "Vraag aan ouder/verzorger: Wat herkent u thuis?",
  ].join("\n").split(/\s+/).slice(0, 120).join(" ");
}

function bouwOudermail(input: ReportInput, woorden: ToonWoorden): string {
  const kern = bouwKernParagraaf(input, woorden);
  const onderwerp = `Onderwerp: korte update over ${input.leerlingLabel}`;
  const aanhefRegel =
    input.toon === "formeel"
      ? "Geachte ouder/verzorger,"
      : input.toon === "warm"
        ? "Beste ouder/verzorger,"
        : "Hallo,";
  const afsluitRegel =
    input.toon === "formeel"
      ? "Met vriendelijke groet,"
      : "Groet,";

  return [
    onderwerp,
    "",
    aanhefRegel,
    "",
    `In de afgelopen periode zagen we het volgende. ${kern}`,
    "",
    "We bespreken graag samen wat een passende vervolgstap is.",
    "",
    afsluitRegel,
  ].join("\n");
}

const BOUWERS: Record<
  RapportOutputType,
  (input: ReportInput, woorden: ToonWoorden) => string
> = {
  rapporttekst: bouwRapporttekst,
  oudergesprek: bouwOudergesprek,
  oudermail: bouwOudermail,
};

/* ------------------------------------------------------------------ */
/* Hoofdgenerator                                                       */
/* ------------------------------------------------------------------ */

export function genereerRapportTekst(input: ReportInput): GeneratedReport {
  const woorden = TOON_WOORDEN[input.toon];
  const bouwer = BOUWERS[input.outputType];
  const tekst = bouwer(input, woorden);

  // Harde AVG-guardrail: de output mag nooit evaluatieve/cijfermatige taal
  // bevatten die niet letterlijk uit de docent-invoer kwam. Dit is een
  // functionele check, geen prompt-instructie.
  const guardrail = controleerOutputTegenInvoer(input.aantekeningen, tekst);

  return {
    id: `rapport-${Date.now()}`,
    createdAt: new Date().toISOString(),
    input,
    tekst,
    guardrail,
    kwaliteit: controleerRapportKwaliteit(input, tekst),
  };
}
