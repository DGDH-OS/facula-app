import { MAX_TEKENS_PER_BULLET } from "./prompt";

/**
 * Opschonen van modeltekst voordat die de app in gaat. Een model doet bijna
 * altijd wat er gevraagd is, maar "bijna" is niet goed genoeg voor tekst die
 * ongelezen in een PowerPoint van een docent belandt. Alles hieronder wordt
 * daarom server-side afgedwongen en niet aan de instructie overgelaten.
 */

/**
 * Haalt het kastlijntje weg. Een kastlijntje tussen spaties werkt als
 * scheidingsteken en wordt een dubbele punt; verder wordt het een komma, zodat
 * de zin leesbaar blijft zonder dat er een woord verdwijnt.
 */
export function zonderKastlijntje(tekst: string): string {
  return tekst
    .replace(/\s+[\u2014\u2013]\s+/g, ": ")
    .replace(/[\u2014\u2013]/g, ", ");
}

/**
 * Haalt markdown weg die een model er soms toch in zet. De exportroutes zetten
 * tekst letterlijk op een dia, dus een sterretje of een streepje vooraan is
 * daar zichtbare rommel en geen opmaak.
 */
function zonderMarkdown(tekst: string): string {
  return tekst
    .replace(/^\s*[-*\u2022]\s+/, "")
    .replace(/^\s*#{1,6}\s+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\s)\*(\S.*?\S)\*(?=\s|$)/g, "$1$2")
    .replace(/(^|\s)_(\S.*?\S)_(?=\s|$)/g, "$1$2")
    .replace(/[\u0060]/g, "");
}

/** Haalt aanhalingstekens weg die om de hele regel heen staan. */
function zonderOmsluitendeQuotes(tekst: string): string {
  const match = tekst.match(/^["\u201c\u2018'](.*)["\u201d\u2019']$/);
  return match ? match[1].trim() : tekst;
}

/**
 * Een enkele regel modeltekst, klaar voor gebruik. Kapt af op
 * MAX_TEKENS_PER_BULLET: dat is een vangnet tegen een uitgelopen regel, de
 * echte woordlimieten komen daarna uit slide-content-rules.ts.
 */
export function schoonRegel(ruw: unknown, maxTekens = MAX_TEKENS_PER_BULLET): string {
  if (typeof ruw !== "string") return "";
  let tekst = zonderKastlijntje(ruw).replace(/\s+/g, " ").trim();
  tekst = zonderMarkdown(tekst);
  tekst = zonderOmsluitendeQuotes(tekst).trim();
  if (tekst.length > maxTekens) {
    tekst = tekst.slice(0, maxTekens).trimEnd();
  }
  return tekst;
}

/** Schoont een lijst regels op en gooit lege regels en dubbelingen eruit. */
export function schoneRegels(ruw: unknown, maxTekens?: number): string[] {
  if (!Array.isArray(ruw)) return [];
  const gezien = new Set<string>();
  const uit: string[] = [];
  for (const regel of ruw) {
    const schoon = schoonRegel(regel, maxTekens);
    if (!schoon) continue;
    const sleutel = schoon.toLowerCase();
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push(schoon);
  }
  return uit;
}

/**
 * Een kernbegrip is alleen de term, nooit "term: uitleg". Zet een model er toch
 * een definitie achter, dan wordt die hier afgeknipt: de definities horen in
 * sectie 2 van de les en de losse termen worden elders gebruikt (titeldia,
 * intro, en straks de toetsgenerator).
 */
export function schoonKernbegrip(ruw: unknown): string {
  const schoon = schoonRegel(ruw, 60);
  const zonderUitleg = schoon.split(":")[0].trim();
  return zonderUitleg.replace(/[.,;]+$/, "").trim();
}
