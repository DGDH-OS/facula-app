import assert from "node:assert/strict";
import {
  analyseerPerKlasPerWeek,
  berekenNakijkplanning,
  dagnaam,
  filterGeldigeItems,
  genereerSignalen,
  isoWeekVanDatum,
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

const vierSos = [1, 2, 3, 4].map((n) =>
  item({ id: "so-" + n, klas: "H4d", vak: "vak", soort: "so", datum: "2026-10-05" }),
);
const soAnalyse = analyseerPerKlasPerWeek(vierSos, instellingen).find((a) => a.klas === "H4d");
assert.equal(soAnalyse?.gewogenBelasting, 2);
assert.equal(soAnalyse?.status, "druk");

const overlapItems = [
  item({ id: "o1", klas: "H4a", vak: "wiskunde", datum: "2026-10-06" }),
  item({ id: "o2", klas: "H4a", vak: "natuurkunde", datum: "2026-10-06" }),
];
const overlapSignalen = genereerSignalen(overlapItems, instellingen);
const overlapTekst = overlapSignalen.find((s) => s.tekst.includes("twee"));
assert.ok(overlapTekst, "overlap-signaal ontbreekt");
assert.ok(overlapTekst!.tekst.includes("H4a heeft op dinsdag 6 oktober twee"));
assert.ok(overlapTekst!.tekst.includes("wiskunde toets"));
assert.ok(overlapTekst!.tekst.includes("natuurkunde toets"));
assert.ok(!bevatGat(overlapTekst!.tekst), "overlapsignaal heeft een gat of dubbele punt");

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

assert.equal(dagnaam("2026-10-06"), "dinsdag 6 oktober");
for (const analyse of analyseerPerKlasPerWeek(allesSamen, instellingen)) {
  assert.ok(!bevatGat(analyse.klas));
}
for (const signaal of genereerSignalen(allesSamen, instellingen)) {
  assert.ok(!bevatGat(signaal.tekst), "gat of dubbele punt in signaal: " + signaal.tekst);
}

console.log("toetsweek-tests: ok");
