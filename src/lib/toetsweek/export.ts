import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import { privacyOuders } from "@/lib/ouders/privacy";
import { dagnaam, isoWeekLabel, type KlasWeekAnalyse } from "./planner";
import type {
  NakijkDagPlanning,
  NakijkTekort,
  ToetsweekSignaal,
} from "./planner";
import type { ToetsItem } from "./types";

/** Alle vrije tekst die een docent zelf typt: toetsnaam en notitie per rij. */
export function vrijeTekstToetsweek(items: ToetsItem[]): string {
  return items.flatMap((item) => [item.naam, item.notitie]).join("\n");
}

export function privacyToetsweek(items: ToetsItem[]) {
  return privacyOuders(vrijeTekstToetsweek(items));
}

function beschrijfItemKort(item: ToetsItem): string {
  return item.naam.trim() ? item.naam.trim() : `${item.vak} ${item.soort}`;
}

function itemZoeker(items: ToetsItem[]) {
  const bijId = new Map(items.map((item) => [item.id, item]));
  return (id: string) => bijId.get(id);
}

/**
 * Bouwt het Word-document met drie onderdelen: overzicht per klas per week,
 * de signalen in gewone zinnen, en de nakijkplanning per dag. Blokkeert net
 * als de andere werkdrukmodules op vrije tekst met privacygevoelige inhoud.
 */
export async function downloadToetsweekWoord(
  items: ToetsItem[],
  analyses: KlasWeekAnalyse[],
  signalen: ToetsweekSignaal[],
  nakijkdagen: NakijkDagPlanning[],
  nakijktekorten: NakijkTekort[],
) {
  const privacy = privacyToetsweek(items);
  if (privacy.blokkeer) return privacy;
  const zoekItem = itemZoeker(items);

  const overzichtAlineas = analyses.flatMap((analyse) => [
    new Paragraph({
      text: `${analyse.klas} — ${isoWeekLabel(analyse)}: ${analyse.status}`,
      heading: HeadingLevel.HEADING_3,
    }),
    ...analyse.items.map(
      (item) =>
        new Paragraph(
          `${dagnaam(item.datum)}: ${beschrijfItemKort(item)} (${item.aantalLeerlingen} leerlingen)`,
        ),
    ),
  ]);

  const signaalAlineas = signalen.length
    ? signalen.map((signaal) => new Paragraph(signaal.tekst))
    : [new Paragraph("Geen signalen: de werkdruk is verdeeld over de weken.")];

  const tekortAlineas = nakijktekorten.map((tekort) => new Paragraph(tekort.melding));
  const nakijkAlineas = nakijkdagen.flatMap((dag) => [
    new Paragraph({ text: dagnaam(dag.datum), heading: HeadingLevel.HEADING_3 }),
    ...dag.toewijzingen.map((toewijzing) => {
      const item = zoekItem(toewijzing.toetsId);
      const omschrijving = item ? `${item.klas} ${item.vak}` : "onbekende toets";
      const tekst =
        `${omschrijving}: ${toewijzing.minuten} minuten, `
        + `ongeveer ${toewijzing.ongeveerLeerlingen} leerlingen`;
      return new Paragraph(tekst);
    }),
  ]);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Toetsweekplanner", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Overzicht per klas per week", heading: HeadingLevel.HEADING_2 }),
          ...(overzichtAlineas.length
            ? overzichtAlineas
            : [new Paragraph("Nog geen geldige toetsen of deadlines ingevoerd.")]),
          new Paragraph({ text: "Signalen", heading: HeadingLevel.HEADING_2 }),
          ...signaalAlineas,
          new Paragraph({ text: "Nakijkplanning", heading: HeadingLevel.HEADING_2 }),
          ...(tekortAlineas.length ? tekortAlineas : []),
          ...(nakijkAlineas.length
            ? nakijkAlineas
            : [new Paragraph("Nog geen cijferdeadlines om op te plannen.")]),
        ],
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "toetsweekplanner.docx";
  link.click();
  URL.revokeObjectURL(url);
  return privacy;
}

function escapeICS(tekst: string): string {
  return tekst
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Vouwt een regel op 75 octets, zoals RFC 5545 voorschrijft. De grens ligt
 * op bytes, niet op tekens: een emoji of ë mag niet middendoor gesplitst
 * worden, dus we schuiven het kappunt terug tot een geldige UTF-8-grens.
 */
function vouwRegel(regel: string): string {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(regel);
  if (bytes.length <= 75) return regel;
  const delen: string[] = [];
  let start = 0;
  let limiet = 75;
  while (start < bytes.length) {
    let eind = Math.min(start + limiet, bytes.length);
    while (eind > start && (bytes[eind] & 0b1100_0000) === 0b1000_0000) eind--;
    delen.push(decoder.decode(bytes.slice(start, eind)));
    start = eind;
    limiet = 74;
  }
  return delen.join("\r\n ");
}

function datumCompact(datum: string): string {
  return datum.replaceAll("-", "");
}

function nuAlsDtstamp(): string {
  return `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function regelsVanEvent(regels: string[]): string {
  return regels.map(vouwRegel).join("\r\n");
}

function toetsEvent(item: ToetsItem, dtstamp: string): string {
  const start = datumCompact(item.datum);
  return regelsVanEvent([
    "BEGIN:VEVENT",
    `UID:${item.id}@facula-toetsweek`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${dagCompactPlusEen(start)}`,
    `SUMMARY:${escapeICS(`${item.vak} ${item.soort} ${item.klas}`)}`,
    "END:VEVENT",
  ]);
}

function dagCompactPlusEen(compact: string): string {
  const jaar = Number(compact.slice(0, 4));
  const maand = Number(compact.slice(4, 6));
  const dag = Number(compact.slice(6, 8));
  const date = new Date(Date.UTC(jaar, maand - 1, dag));
  date.setUTCDate(date.getUTCDate() + 1);
  const j = date.getUTCFullYear().toString().padStart(4, "0");
  const m = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const d = date.getUTCDate().toString().padStart(2, "0");
  return `${j}${m}${d}`;
}

function nakijkEvent(
  dagDatum: string,
  item: ToetsItem,
  minuten: number,
  dtstamp: string,
): string {
  const start = datumCompact(dagDatum);
  return regelsVanEvent([
    "BEGIN:VEVENT",
    `UID:${item.id}-nakijk-${start}@facula-toetsweek`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${dagCompactPlusEen(start)}`,
    `SUMMARY:${escapeICS(`Nakijken ${item.klas} ${item.vak} (${minuten} min)`)}`,
    "END:VEVENT",
  ]);
}

export type IcsKeuze = "toetsen" | "nakijken" | "beide";

/** Bouwt een RFC 5545-geldig .ics-bestand met CRLF-regeleindes en vouwing. */
export function genereerICS(
  items: ToetsItem[],
  nakijkdagen: NakijkDagPlanning[],
  keuze: IcsKeuze,
): string {
  const dtstamp = nuAlsDtstamp();
  const zoekItem = itemZoeker(items);
  const events: string[] = [];
  if (keuze === "toetsen" || keuze === "beide") {
    for (const item of items) events.push(toetsEvent(item, dtstamp));
  }
  if (keuze === "nakijken" || keuze === "beide") {
    for (const dag of nakijkdagen) {
      for (const toewijzing of dag.toewijzingen) {
        const item = zoekItem(toewijzing.toetsId);
        if (!item) continue;
        events.push(nakijkEvent(dag.datum, item, toewijzing.minuten, dtstamp));
      }
    }
  }
  const kop = regelsVanEvent([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Facula//Toetsweekplanner//NL",
  ]);
  const staart = regelsVanEvent(["END:VCALENDAR"]);
  return [kop, ...events, staart].join("\r\n") + "\r\n";
}

export function downloadICS(inhoud: string, bestandsnaam = "toetsweekplanner.ics") {
  const blob = new Blob([inhoud], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bestandsnaam;
  link.click();
  URL.revokeObjectURL(url);
}
