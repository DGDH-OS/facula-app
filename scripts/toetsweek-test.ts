import assert from "node:assert/strict";
import {
  analyseerPerKlasPerWeek,
  berekenNakijkplanning,
  dagnaam,
  filterGeldigeItems,
  genereerSignalen,
  isoWeekVanDatum,
  naarNederlandsGetal,
  telWerkdagenTussen,
  valideerItem,
} from "../src/lib/toetsweek/planner";
import {
  STANDAARD_INSTELLINGEN,
  nieuwToetsItem,
  type ToetsItem,
  type ToetsweekInstellingen,
} from "../src/lib/toetsweek/types";
import { genereerICS, privacyToetsweek } from "../src/lib/toetsweek/export";

function item(overschrijving: Partial<ToetsItem>): ToetsItem {
  return { ...nieuwToetsItem(overschrijving.klas ?? "H4a"), ...overschrijving };
}

function bevatGat(tekst: string): boolean {
  return /  |\.\./.test(tekst);
}

assert.deepEqual(isoWeekVanDatum("2026-12-31"), { jaar: 2026, week: 53 });
assert.deepEqual(isoWeekVanDatum("2027-01-01"), { jaar: 2026, week: 53 });
assert.deepEqual(isoWeekVanDatum("2027-01-04"), { jaar: 2027, week: 1 });

const instellingen: ToetsweekInstellingen = STANDAARD_INSTELLINGEN;
const rustigeWeek = [
  item({ id: "r1", klas: "H4a", vak: "wiskunde", datum: "2026-10-05" }),
  item({ id: "r2", klas: "H4a", vak: "natuurkunde", soort: "so", datum: "2026-10-05" }),
];

const drukkeWeek = [
  item({ id: "d1", klas: "H4b", vak: "wiskunde", datum: "2026-10-05" }),
  item({ id: "d2", klas: "H4b", vak: "natuurkunde", datum: "2026-10-06" }),
];
const teDrukkeWeek = [
  item({ id: "t1", klas: "H4c", vak: "wiskunde", datum: "2026-10-05" }),
  item({ id: "t2", klas: "H4c", vak: "natuurkunde", datum: "2026-10-06" }),
  item({ id: "t3", klas: "H4c", vak: "geschiedenis", datum: "2026-10-07" }),
];

const allesSamen = [...rustigeWeek, ...drukkeWeek, ...teDrukkeWeek];
const analyses = analyseerPerKlasPerWeek(allesSamen, instellingen);
const statusVan = (klas: string) => analyses.find((a) => a.klas === klas)?.status;
assert.equal(statusVan("H4a"), "rustig", "1,5 gewicht hoort rustig te zijn");
assert.equal(statusVan("H4b"), "druk", "2 gewicht hoort druk te zijn");
assert.equal(statusVan("H4c"), "te druk", "3 gewicht hoort te druk te zijn");

assert.equal(naarNederlandsGetal(2.5), "2,5");
assert.equal(naarNederlandsGetal(3), "3");

const decimaleWeek = [
  item({ id: "dec1", klas: "H4e", vak: "wiskunde", soort: "toets", datum: "2026-10-05" }),
  item({
    id: "dec2",
    klas: "H4e",
    vak: "natuurkunde",
    soort: "praktische opdracht",
    datum: "2026-10-06",
  }),
  item({ id: "dec3", klas: "H4e", vak: "geschiedenis", soort: "so", datum: "2026-10-07" }),
];
const decimaalSignaal = genereerSignalen(decimaleWeek, instellingen).find((s) =>
  s.tekst.includes("H4e"),
);
assert.ok(decimaalSignaal, "decimaal weeksignaal ontbreekt");
assert.ok(
  decimaalSignaal!.tekst.includes("gewogen belasting 2,5"),
  "weeksignaal mist Nederlandse notatie: " + decimaalSignaal!.tekst,
);
assert.ok(!decimaalSignaal!.tekst.includes("2.5"), "weeksignaal mag geen punt als decimaalteken hebben");

const vierSos = [1, 2, 3, 4].map((n) =>
  item({ id: "so-" + n, klas: "H4d", vak: "vak", soort: "so", datum: "2026-10-05" }),
);
const soAnalyse = analyseerPerKlasPerWeek(vierSos, instellingen).find((a) => a.klas === "H4d");
assert.equal(soAnalyse?.gewogenBelasting, 2);
assert.equal(soAnalyse?.status, "druk");

const overlapItems = [
  item({ id: "o1", klas: "H4a", vak: "wiskunde", soort: "toets", datum: "2026-10-06" }),
  item({ id: "o2", klas: "H4a", vak: "natuurkunde", soort: "toets", datum: "2026-10-06" }),
];
const overlapSignalen = genereerSignalen(overlapItems, instellingen);
const overlapTekst = overlapSignalen.find((s) => s.tekst.includes("twee"));
assert.ok(overlapTekst, "overlap-signaal ontbreekt");
assert.equal(
  overlapTekst!.tekst,
  "H4a heeft op dinsdag 6 oktober twee toetsen: de toets wiskunde en de toets natuurkunde.",
);
assert.ok(!bevatGat(overlapTekst!.tekst), "overlapsignaal heeft een gat of dubbele punt");

const gemengdeOverlapItems = [
  item({ id: "m1", klas: "H4a", vak: "wiskunde", soort: "toets", datum: "2026-10-06" }),
  item({ id: "m2", klas: "H4a", vak: "natuurkunde", soort: "so", datum: "2026-10-06" }),
];
const gemengdeSignalen = genereerSignalen(gemengdeOverlapItems, instellingen);
const gemengdeTekst = gemengdeSignalen.find((s) => s.tekst.includes("twee"));
assert.ok(gemengdeTekst, "gemengd overlap-signaal ontbreekt");
assert.equal(
  gemengdeTekst!.tekst,
  "H4a heeft op dinsdag 6 oktober twee toetsmomenten: de toets wiskunde en de so natuurkunde.",
);
assert.ok(!bevatGat(gemengdeTekst!.tekst), "gemengd overlapsignaal heeft een gat of dubbele punt");

const drieOverlapItems = [
  item({ id: "dr1", klas: "H4a", vak: "wiskunde", soort: "toets", datum: "2026-10-06" }),
  item({ id: "dr2", klas: "H4a", vak: "natuurkunde", soort: "toets", datum: "2026-10-06" }),
  item({ id: "dr3", klas: "H4a", vak: "scheikunde", soort: "toets", datum: "2026-10-06" }),
];
const drieSignalen = genereerSignalen(drieOverlapItems, instellingen);
const drieTekst = drieSignalen.find((s) => s.tekst.includes("drie"));
assert.ok(drieTekst, "drievoudig overlap-signaal ontbreekt");
assert.equal(
  drieTekst!.tekst,
  "H4a heeft op dinsdag 6 oktober drie toetsen: de toets wiskunde, de toets natuurkunde"
    + " en de toets scheikunde.",
);
assert.ok(!bevatGat(drieTekst!.tekst), "drievoudig overlapsignaal heeft een gat of dubbele punt");

const metOngeldigeRij = [
  item({ id: "g1", klas: "H4a", vak: "wiskunde", datum: "2026-10-05" }),
  item({ id: "g2", klas: "H4a", vak: "natuurkunde", datum: "geen-datum" }),
];
assert.equal(valideerItem(metOngeldigeRij[1]).length, 1);
const filterResultaat = filterGeldigeItems(metOngeldigeRij);
assert.equal(filterResultaat.geldig.length, 1);
assert.equal(filterResultaat.aantalOngeldig, 1);
assert.equal(
  analyseerPerKlasPerWeek(metOngeldigeRij, instellingen).reduce(
    (som, a) => som + a.items.length,
    0,
  ),
  1,
);

const skipInstellingen: ToetsweekInstellingen = {
  ...instellingen,
  nakijkminutenPerDag: 60,
  extraVrijeDatums: ["2026-10-08"],
};
const skipItem = item({
  id: "skip-1",
  klas: "H4a",
  vak: "wiskunde",
  datum: "2026-10-05",
  cijferdeadline: "2026-10-15",
  aantalLeerlingen: 1,
  nakijkminuten: 200,
});
const skipPlanning = berekenNakijkplanning([skipItem], skipInstellingen);
const skipData = new Map(skipPlanning.dagen.map((d) => [d.datum, d.toewijzingen[0].minuten]));
assert.deepEqual(
  [...skipData.entries()],
  [
    ["2026-10-06", 60],
    ["2026-10-07", 60],
    ["2026-10-09", 60],
    ["2026-10-12", 20],
  ],
);
assert.ok(!skipData.has("2026-10-08"), "extra vrije dag mag geen nakijktijd krijgen");
assert.ok(!skipData.has("2026-10-10"), "zaterdag mag geen nakijktijd krijgen");
assert.ok(!skipData.has("2026-10-11"), "zondag mag geen nakijktijd krijgen");
assert.equal(skipPlanning.tekorten.length, 0);

const edfInstellingen: ToetsweekInstellingen = {
  ...instellingen,
  nakijkminutenPerDag: 60,
};
const vroeg = item({
  id: "edf-a",
  klas: "H4a",
  vak: "wiskunde",
  datum: "2026-10-05",
  cijferdeadline: "2026-10-08",
  aantalLeerlingen: 1,
  nakijkminuten: 50,
});
const laat = item({
  id: "edf-b",
  klas: "H4b",
  vak: "natuurkunde",
  datum: "2026-10-05",
  cijferdeadline: "2026-10-09",
  aantalLeerlingen: 1,
  nakijkminuten: 80,
});
const edfPlanning = berekenNakijkplanning([vroeg, laat], edfInstellingen);
function minutenOp(datum: string, toetsId: string): number {
  const dag = edfPlanning.dagen.find((d) => d.datum === datum);
  return dag?.toewijzingen.find((t) => t.toetsId === toetsId)?.minuten ?? 0;
}
assert.equal(minutenOp("2026-10-06", "edf-a"), 50, "vroege deadline claimt dinsdag eerst");
assert.equal(minutenOp("2026-10-06", "edf-b"), 10, "late deadline krijgt de rest van dinsdag");
assert.equal(minutenOp("2026-10-07", "edf-b"), 60);
assert.equal(minutenOp("2026-10-08", "edf-b"), 10);
assert.equal(edfPlanning.tekorten.length, 0);

const tekortInstellingen: ToetsweekInstellingen = {
  ...instellingen,
  nakijkminutenPerDag: 60,
};
const tekortItem = item({
  id: "tekort-1",
  klas: "H4a",
  vak: "wiskunde",
  datum: "2026-10-05",
  cijferdeadline: "2026-10-07",
  aantalLeerlingen: 2,
  nakijkminuten: 100,
});
const tekortPlanning = berekenNakijkplanning([tekortItem], tekortInstellingen);
assert.equal(tekortPlanning.tekorten.length, 1);
const tekort = tekortPlanning.tekorten[0];
assert.equal(tekort.tekortMinuten, 140);
assert.ok(tekort.melding.includes("140 minuten nakijktijd tekort"));
assert.ok(tekort.melding.includes(dagnaam("2026-10-07")));
assert.ok(tekort.melding.includes("140 minuten per dag extra vrij"));
assert.ok(!bevatGat(tekort.melding), "tekortmelding heeft een gat of dubbele punt");

assert.equal(telWerkdagenTussen("2026-10-06", "2026-10-06", tekortInstellingen), 1);

const privacyItems = [
  item({
    id: "privacy-1",
    klas: "H4a",
    vak: "wiskunde",
    datum: "2026-10-05",
    naam: "Vraag naar docent@voorbeeldschool.nl",
  }),
];
assert.equal(privacyToetsweek(privacyItems).blokkeer, true);
assert.equal(
  privacyToetsweek([item({ id: "schoon-1", klas: "H4a", vak: "wiskunde", datum: "2026-10-05" })])
    .blokkeer,
  false,
);

const icsItems = [
  item({
    id: "ics-1",
    klas: "H4a",
    vak: "geschiedenis, met een heel lange vaknaam voor de vouwing van deze regel",
    soort: "toets",
    datum: "2026-10-06",
    cijferdeadline: "2026-10-20",
  }),
];
const icsPlanning = berekenNakijkplanning(icsItems, { ...instellingen, nakijkminutenPerDag: 60 });
const ics = genereerICS(icsItems, icsPlanning.dagen, "beide");
assert.ok(ics.includes("BEGIN:VCALENDAR\r\n"));
assert.ok(ics.includes("VERSION:2.0\r\n"));
assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
assert.ok(!/[^\r]\n/.test(ics), "elke nieuwe regel moet voorafgegaan worden door een CR");
const encoder = new TextEncoder();
for (const regel of ics.split("\r\n")) {
  assert.ok(encoder.encode(regel).length <= 75, "regel te lang: " + regel);
}
assert.ok(ics.includes("geschiedenis\\,"), "komma in de vaknaam moet ge-escaped zijn");

const ontgevouwenRegels: string[] = [];
for (const regel of ics.split("\r\n")) {
  if (regel.startsWith(" ") && ontgevouwenRegels.length > 0) {
    ontgevouwenRegels[ontgevouwenRegels.length - 1] += regel.slice(1);
  } else {
    ontgevouwenRegels.push(regel);
  }
}
const summaryRegels = ontgevouwenRegels.filter((regel) => regel.startsWith("SUMMARY:"));
assert.ok(summaryRegels.length > 0, "geen SUMMARY-regels gevonden");
for (const regel of summaryRegels) {
  assert.ok(regel.slice("SUMMARY:".length).trim().length > 0, "lege SUMMARY");
}
const dtstartRegel = ics.split("\r\n").find((r) => r.startsWith("DTSTART;VALUE=DATE:20261006"));
assert.ok(dtstartRegel);
assert.ok(ics.includes("DTEND;VALUE=DATE:20261007"), "DTEND moet een dag na DTSTART liggen");

const zonderNaam = item({
  id: "sum-1",
  klas: "H4a",
  vak: "wiskunde",
  soort: "toets",
  datum: "2026-10-06",
});
const metNaam = item({
  id: "sum-2",
  klas: "H4a",
  vak: "engels",
  soort: "inleverdeadline",
  datum: "2026-10-06",
  naam: "Hoofdstuk 3",
});
const soItem = item({
  id: "sum-3",
  klas: "H4a",
  vak: "natuurkunde",
  soort: "so",
  datum: "2026-10-06",
});
const samenvattingIcs = genereerICS([zonderNaam, metNaam, soItem], [], "toetsen");
assert.ok(samenvattingIcs.includes("SUMMARY:Toets wiskunde (H4a)"));
assert.ok(samenvattingIcs.includes("SUMMARY:Inleverdeadline engels (H4a): Hoofdstuk 3"));
assert.ok(samenvattingIcs.includes("SUMMARY:So natuurkunde (H4a)"));

const nakijkItem = item({
  id: "nak-1",
  klas: "H4a",
  vak: "wiskunde",
  soort: "toets",
  datum: "2026-10-06",
  cijferdeadline: "2026-10-13",
  aantalLeerlingen: 1,
  nakijkminuten: 60,
});
const nakijkVoorIcs = berekenNakijkplanning([nakijkItem], { ...instellingen, nakijkminutenPerDag: 60 });
const nakijkIcs = genereerICS([nakijkItem], nakijkVoorIcs.dagen, "nakijken");
assert.ok(nakijkIcs.includes("SUMMARY:Nakijken wiskunde H4a (60 min)"));

const uidItem = item({ id: "uid.item#1@x", klas: "H4a", vak: "wiskunde", datum: "2026-10-06" });
const uidIcs = genereerICS([uidItem], [], "toetsen");
assert.ok(uidIcs.includes("UID:uiditem1x@facula-toetsweek"), "UID moet gesaneerd zijn");
assert.ok(!uidIcs.includes("uid.item#1@x@facula-toetsweek"), "ongesaneerde tekens mogen niet in UID");
const uidIcsHerhaald = genereerICS([uidItem], [], "toetsen");
assert.equal(uidIcs, uidIcsHerhaald, "UID moet gelijk zijn bij twee generaties met dezelfde items");

const crInjectieItem = item({
  id: "cr-1",
  klas: "H4a",
  vak: "wiskunde",
  datum: "2026-10-06",
  naam: "a\rBEGIN:VEVENT",
});
const crIcs = genereerICS([crInjectieItem], [], "toetsen");
const crRegels = crIcs.split("\r\n");
assert.equal(
  crRegels.filter((regel) => regel === "BEGIN:VEVENT").length,
  1,
  "CR-injectie mag geen extra BEGIN:VEVENT-regel opleveren",
);

const escapeItem = item({
  id: "esc-1",
  klas: "H4a",
  vak: "wiskunde",
  datum: "2026-10-06",
  naam: "backslash \\ en\nnieuwe regel",
});
const escapeIcs = genereerICS([escapeItem], [], "toetsen");
assert.ok(
  escapeIcs.includes("backslash \\\\ en\\nnieuwe regel"),
  "backslash en newline moeten letterlijk geescaped zijn",
);

const multibyteItem = item({
  id: "mb-1",
  klas: "H4a",
  vak: "wiskunde",
  datum: "2026-10-06",
  naam: "één café 🎉".repeat(10),
});
const multibyteIcs = genereerICS([multibyteItem], [], "toetsen");
const multibyteRegels = multibyteIcs.split("\r\n");
for (const regel of multibyteRegels) {
  assert.ok(encoder.encode(regel).length <= 75, "multibyte-regel te lang: " + regel);
}
const multibyteSummaryRegels: string[] = [];
for (const regel of multibyteRegels) {
  if (regel.startsWith("SUMMARY:")) multibyteSummaryRegels.push(regel);
  else if (regel.startsWith(" ") && multibyteSummaryRegels.length > 0) {
    multibyteSummaryRegels[multibyteSummaryRegels.length - 1] += regel.slice(1);
  }
}
const multibyteOntvouwen = multibyteSummaryRegels[0];
assert.ok(multibyteOntvouwen.includes(escapeICSVoorTest("één café 🎉".repeat(10))));
assert.ok(!multibyteOntvouwen.includes("\uFFFD"), "ontvouwen tekst mag geen U+FFFD bevatten");

function escapeICSVoorTest(tekst: string): string {
  return tekst.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

const geblokkeerdItems = [
  item({
    id: "blok-1",
    klas: "H4a",
    vak: "wiskunde",
    datum: "2026-10-06",
    naam: "Mail docent@voorbeeldschool.nl",
  }),
];
assert.throws(() => genereerICS(geblokkeerdItems, [], "toetsen"), /geblokkeerd/);

assert.equal(dagnaam("2026-10-06"), "dinsdag 6 oktober");
for (const analyse of analyseerPerKlasPerWeek(allesSamen, instellingen)) {
  assert.ok(!bevatGat(analyse.klas));
}
for (const signaal of genereerSignalen(allesSamen, instellingen)) {
  assert.ok(!bevatGat(signaal.tekst), "gat of dubbele punt in signaal: " + signaal.tekst);
}

console.log("toetsweek-tests: ok");
