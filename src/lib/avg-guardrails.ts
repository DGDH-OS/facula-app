import type { ReportGuardrailResultaat } from "./types";

/**
 * AVG-guardrail voor de rapport- en oudercommunicatie-module.
 *
 * HARDE PRODUCTREGEL (geen prompt-instructie, geen UI-tekst — een echte
 * functie die getest wordt): de generator mag NOOIT zelf een cijfer, een
 * beoordeling, een kwalificatie-oordeel of een advies over overgaan/zakken
 * toevoegen aan de tekst. De generator mag alleen herformuleren wat de
 * docent letterlijk zelf heeft ingevoerd.
 *
 * Deze check is opzettelijk simpel en regel-gebaseerd (geen AI-classifier):
 * hij vergelijkt de gegenereerde tekst met de oorspronkelijke docent-invoer
 * en vlagt elk evaluatief/cijfermatig signaalwoord dat in de OUTPUT staat
 * maar niet letterlijk in de INVOER voorkwam. Zo kan de generator zelf zulke
 * woorden nooit "erbij verzinnen" zonder dat dit opgemerkt wordt.
 */

/**
 * Signaalwoorden die een eindoordeel, kwalificatie, cijfer-taal of
 * overgaan/zakken-advies uitdrukken. Deze mag de generator nooit zelf
 * toevoegen — alleen doorgeven als de docent ze letterlijk zelf typte.
 */
export const EVALUATIEVE_SIGNAALWOORDEN: string[] = [
  "onvoldoende",
  "voldoende",
  "uitstekend",
  "matig",
  "zwak",
  "zwakke",
  "gebrekkig",
  "uitmuntend",
  "zakt",
  "zakken",
  "gezakt",
  "blijft zitten",
  "blijven zitten",
  "doubleert",
  "doubleren",
  "moet over",
  "gaat over naar",
  "overgaan",
  "niet overgaan",
  "eindcijfer",
  "rapportcijfer",
  "gemiddeld cijfer",
  "cijfer",
  "cijfers",
  "geslaagd",
  "onvoldoendes",
  "aanbeveling: blijven zitten",
  "advies: blijven zitten",
  "slaagt niet",
  "haalt het niveau niet",
];

/**
 * Verwijdert datums (bijv. "21-9-2026" of een regel die met "Datum:" begint)
 * voordat op cijfer-achtige getallen wordt gescand, zodat een datum nooit
 * per ongeluk als (verzonnen) rapportcijfer wordt aangemerkt.
 */
function verwijderDatums(tekst: string): string {
  return tekst
    .replace(/^datum:.*$/gim, "")
    .replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, "");
}

/** Vindt losse getallen in tekst die als rapportcijfer gelezen kunnen worden. */
function vindCijferAchtigeGetallen(tekst: string): string[] {
  const zonderDatums = verwijderDatums(tekst);
  const matches = zonderDatums.match(/\b(?:10|[1-9])(?:[.,][0-9])?\b/g) ?? [];
  return Array.from(new Set(matches));
}

/**
 * Controleert of de gegenereerde tekst evaluatieve/cijfermatige taal bevat
 * die niet letterlijk uit de docent-invoer kwam. `ok: false` betekent dat de
 * output geblokkeerd of herzien moet worden voordat hij getoond wordt.
 */
export function controleerOutputTegenInvoer(
  origineleInvoer: string,
  gegenereerdeTekst: string
): ReportGuardrailResultaat {
  const invoerLower = origineleInvoer.toLowerCase();
  const outputLower = gegenereerdeTekst.toLowerCase();
  const gevonden: string[] = [];

  for (const woord of EVALUATIEVE_SIGNAALWOORDEN) {
    const inOutput = outputLower.includes(woord);
    const inInvoer = invoerLower.includes(woord);
    if (inOutput && !inInvoer) {
      gevonden.push(woord);
    }
  }

  for (const cijfer of vindCijferAchtigeGetallen(gegenereerdeTekst)) {
    if (!origineleInvoer.includes(cijfer)) {
      gevonden.push(`cijfer "${cijfer}"`);
    }
  }

  return {
    ok: gevonden.length === 0,
    gevondenWoorden: Array.from(new Set(gevonden)),
  };
}
