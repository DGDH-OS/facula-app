import {
  GEWICHT_PER_SOORT,
  type ToetsItem,
  type ToetsweekInstellingen,
} from "./types";

/** Veiligheidsgrens tegen eindeloze lussen: tien jaar, ruim boven elke echte cijferdeadline. */
const MAX_HORIZON_DAGEN = 3660;

const DAGNAMEN = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];

const MAANDNAMEN = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

const DATUM_PATROON = /^\d{4}-\d{2}-\d{2}$/;

/** Strikte YYYY-MM-DD check, inclusief een echte kalenderdatum (geen 31 februari). */
export function isGeldigeDatum(datum: string): boolean {
  if (!DATUM_PATROON.test(datum)) return false;
  const [jaar, maand, dag] = datum.split("-").map(Number);
  const test = new Date(Date.UTC(jaar, maand - 1, dag));
  return (
    test.getUTCFullYear() === jaar &&
    test.getUTCMonth() === maand - 1 &&
    test.getUTCDate() === dag
  );
}

function naarUTCDatum(datum: string): Date {
  const [jaar, maand, dag] = datum.split("-").map(Number);
  return new Date(Date.UTC(jaar, maand - 1, dag));
}

function naarDatumString(datum: Date): string {
  const jaar = datum.getUTCFullYear().toString().padStart(4, "0");
  const maand = (datum.getUTCMonth() + 1).toString().padStart(2, "0");
  const dag = datum.getUTCDate().toString().padStart(2, "0");
  return `${jaar}-${maand}-${dag}`;
}

/** Telt in kalenderdagen op, zonder tijdzone-effecten (alles blijft in UTC). */
export function voegDagenToe(datum: string, aantalDagen: number): string {
  const date = naarUTCDatum(datum);
  date.setUTCDate(date.getUTCDate() + aantalDagen);
  return naarDatumString(date);
}

export function dagnaam(datum: string): string {
  const date = naarUTCDatum(datum);
  return `${DAGNAMEN[date.getUTCDay()]} ${date.getUTCDate()} ${MAANDNAMEN[date.getUTCMonth()]}`;
}

export type IsoWeek = { jaar: number; week: number };

/**
 * ISO 8601-weeknummer: de donderdag van de week bepaalt het jaar, en week 1
 * is de week met de eerste donderdag van dat jaar. Dat lost zowel de
 * jaarovergang op (30/31 december kunnen al in week 1 van het volgende jaar
 * vallen) als de omgekeerde overgang (begin januari kan nog in week 52/53
 * van het vorige jaar vallen).
 */
export function isoWeekVanDatum(datum: string): IsoWeek {
  const date = naarUTCDatum(datum);
  const dagNummer = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dagNummer + 3);
  const jaarStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - jaarStart.getTime()) / 86_400_000 + 1) / 7);
  return { jaar: date.getUTCFullYear(), week };
}

export function isoWeekSleutel({ jaar, week }: IsoWeek): string {
  return `${jaar}-${week.toString().padStart(2, "0")}`;
}

export function isoWeekLabel({ jaar, week }: IsoWeek): string {
  return `week ${week}, ${jaar}`;
}

export function isVrijeDag(datum: string, instellingen: ToetsweekInstellingen): boolean {
  const date = naarUTCDatum(datum);
  if (instellingen.vrijeWeekdagen.includes(date.getUTCDay())) return true;
  return instellingen.extraVrijeDatums.includes(datum);
}

/** Eerste werkdag op of na `datum`, gebruikt om nakijkvensters te laten starten. */
export function eersteWerkdagVanaf(
  datum: string,
  instellingen: ToetsweekInstellingen,
): string {
  let huidige = datum;
  let stappen = 0;
  while (isVrijeDag(huidige, instellingen) && stappen < MAX_HORIZON_DAGEN) {
    huidige = voegDagenToe(huidige, 1);
    stappen++;
  }
  return huidige;
}

/** Telt niet-vrije dagen in het gesloten interval [start, eind]. */
export function telWerkdagenTussen(
  start: string,
  eind: string,
  instellingen: ToetsweekInstellingen,
): number {
  if (start > eind) return 0;
  let dag = start;
  let aantal = 0;
  let stappen = 0;
  while (dag <= eind && stappen < MAX_HORIZON_DAGEN) {
    if (!isVrijeDag(dag, instellingen)) aantal++;
    dag = voegDagenToe(dag, 1);
    stappen++;
  }
  return aantal;
}

/** Default cijferdeadline: 10 werkdagen na de toetsdatum, gegeven de instellingen. */
export function standaardCijferdeadline(
  datum: string,
  instellingen: ToetsweekInstellingen,
): string {
  let dag = datum;
  let geteld = 0;
  let stappen = 0;
  while (geteld < 10 && stappen < MAX_HORIZON_DAGEN) {
    dag = voegDagenToe(dag, 1);
    stappen++;
    if (!isVrijeDag(dag, instellingen)) geteld++;
  }
  return dag;
}

export type ItemFout =
  | "datum-ongeldig"
  | "cijferdeadline-ongeldig"
  | "cijferdeadline-voor-datum"
  | "leerlingen-ongeldig";

const ITEM_FOUTMELDINGEN: Record<ItemFout, string> = {
  "datum-ongeldig": "De datum is ongeldig.",
  "cijferdeadline-ongeldig": "De cijferdeadline is ongeldig.",
  "cijferdeadline-voor-datum": "De cijferdeadline ligt voor de toetsdatum.",
  "leerlingen-ongeldig": "Vul een aantal leerlingen groter dan 0 in.",
};

export function valideerItem(item: ToetsItem): ItemFout[] {
  const fouten: ItemFout[] = [];
  if (!isGeldigeDatum(item.datum)) fouten.push("datum-ongeldig");
  if (item.cijferdeadline && !isGeldigeDatum(item.cijferdeadline)) {
    fouten.push("cijferdeadline-ongeldig");
  } else if (
    isGeldigeDatum(item.datum) &&
    item.cijferdeadline &&
    item.cijferdeadline < item.datum
  ) {
    fouten.push("cijferdeadline-voor-datum");
  }
  if (!Number.isFinite(item.aantalLeerlingen) || item.aantalLeerlingen <= 0) {
    fouten.push("leerlingen-ongeldig");
  }
  return fouten;
}

export function foutmelding(fout: ItemFout): string {
  return ITEM_FOUTMELDINGEN[fout];
}

export function filterGeldigeItems(items: ToetsItem[]): {
  geldig: ToetsItem[];
  aantalOngeldig: number;
} {
  const geldig = items.filter((item) => valideerItem(item).length === 0);
  return { geldig, aantalOngeldig: items.length - geldig.length };
}

export type KlasWeekStatus = "rustig" | "druk" | "te druk";

export type KlasWeekAnalyse = {
  klas: string;
  jaar: number;
  week: number;
  items: ToetsItem[];
  gewogenBelasting: number;
  status: KlasWeekStatus;
};

function bepaalStatus(
  gewogenBelasting: number,
  instellingen: ToetsweekInstellingen,
): KlasWeekStatus {
  if (gewogenBelasting >= instellingen.teDrukGrens) return "te druk";
  if (gewogenBelasting >= instellingen.drukGrens) return "druk";
  return "rustig";
}

/** Groepeert geldige items per klas per ISO-week en bepaalt de piekstatus. */
export function analyseerPerKlasPerWeek(
  items: ToetsItem[],
  instellingen: ToetsweekInstellingen,
): KlasWeekAnalyse[] {
  const groepen = new Map<string, KlasWeekAnalyse>();
  for (const item of items) {
    if (valideerItem(item).length > 0) continue;
    const { jaar, week } = isoWeekVanDatum(item.datum);
    const sleutel = `${item.klas}|${jaar}-${week}`;
    const bestaand = groepen.get(sleutel);
    if (bestaand) {
      bestaand.items.push(item);
      bestaand.gewogenBelasting += GEWICHT_PER_SOORT[item.soort];
    } else {
      groepen.set(sleutel, {
        klas: item.klas,
        jaar,
        week,
        items: [item],
        gewogenBelasting: GEWICHT_PER_SOORT[item.soort],
        status: "rustig",
      });
    }
  }
  const analyses = [...groepen.values()].map((analyse) => ({
    ...analyse,
    items: [...analyse.items].sort((a, b) => a.datum.localeCompare(b.datum)),
    status: bepaalStatus(analyse.gewogenBelasting, instellingen),
  }));
  return analyses.sort(
    (a, b) => a.jaar - b.jaar || a.week - b.week || a.klas.localeCompare(b.klas),
  );
}

export type ToetsweekSignaal = { datum: string; tekst: string };

const TELWOORDEN = ["nul", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht"];

function telwoord(aantal: number): string {
  return TELWOORDEN[aantal] ?? aantal.toString();
}

/** "de toets wiskunde" of, met naam, "de naam". */
function beschrijfItemNatuurlijk(item: ToetsItem): string {
  return item.naam.trim() ? `de ${item.naam.trim()}` : `de ${item.soort} ${item.vak}`;
}

/** "a en b" bij twee items, "a, b en c" bij drie of meer. */
function opsomming(delen: string[]): string {
  if (delen.length === 1) return delen[0];
  return `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;
}

/** Meldt per klas en dag expliciet wanneer er twee of meer items samenvallen. */
function overlapSignalen(items: ToetsItem[]): ToetsweekSignaal[] {
  const perKlasDag = new Map<string, ToetsItem[]>();
  for (const item of items) {
    if (valideerItem(item).length > 0) continue;
    const sleutel = `${item.klas}|${item.datum}`;
    const lijst = perKlasDag.get(sleutel) ?? [];
    lijst.push(item);
    perKlasDag.set(sleutel, lijst);
  }
  const signalen: ToetsweekSignaal[] = [];
  for (const [, lijst] of perKlasDag) {
    if (lijst.length < 2) continue;
    const [eerste] = lijst;
    const allesZelfdeSoort = lijst.every((item) => item.soort === eerste.soort);
    const momentWoord = allesZelfdeSoort
      ? lijst.length === 1
        ? "toets"
        : "toetsen"
      : "toetsmomenten";
    const beschrijvingen = opsomming(lijst.map(beschrijfItemNatuurlijk));
    signalen.push({
      datum: eerste.datum,
      tekst:
        `${eerste.klas} heeft op ${dagnaam(eerste.datum)} ${telwoord(lijst.length)}`
        + ` ${momentWoord}: ${beschrijvingen}.`,
    });
  }
  return signalen;
}

/** Nederlandse notatie: komma als decimaalteken, maximaal één decimaal. */
export function naarNederlandsGetal(getal: number): string {
  return getal.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
}

function weekSignalen(analyses: KlasWeekAnalyse[]): ToetsweekSignaal[] {
  return analyses
    .filter((analyse) => analyse.status !== "rustig")
    .map((analyse) => {
      const eersteDatum = analyse.items[0].datum;
      const belasting = naarNederlandsGetal(Math.round(analyse.gewogenBelasting * 10) / 10);
      const aantal = analyse.items.length;
      const woord = aantal === 1 ? "toets of deadline" : "toetsen en deadlines";
      return {
        datum: eersteDatum,
        tekst:
          analyse.status === "te druk"
            ? `${analyse.klas} is te druk in ${isoWeekLabel(analyse)}: ${aantal} ${woord},`
              + ` gewogen belasting ${belasting}.`
            : `${analyse.klas} is druk in ${isoWeekLabel(analyse)}: ${aantal} ${woord},`
              + ` gewogen belasting ${belasting}.`,
      };
    });
}

/** Combineert piek- en overlapsignalen tot één lijst, gesorteerd op datum. */
export function genereerSignalen(
  items: ToetsItem[],
  instellingen: ToetsweekInstellingen,
): ToetsweekSignaal[] {
  const analyses = analyseerPerKlasPerWeek(items, instellingen);
  const signalen = [...weekSignalen(analyses), ...overlapSignalen(items)];
  return signalen.sort((a, b) => a.datum.localeCompare(b.datum));
}

export type NakijkToewijzing = {
  toetsId: string;
  minuten: number;
  ongeveerLeerlingen: number;
};

export type NakijkDagPlanning = {
  datum: string;
  toewijzingen: NakijkToewijzing[];
};

export type NakijkTekort = {
  toetsId: string;
  tekortMinuten: number;
  melding: string;
};

export type NakijkWeekBelasting = { jaar: number; week: number; minuten: number };

export type NakijkplanningResultaat = {
  dagen: NakijkDagPlanning[];
  tekorten: NakijkTekort[];
  totaalPerWeek: NakijkWeekBelasting[];
};

/**
 * Plant nakijktijd terug vanaf de cijferdeadline, earliest-deadline-first,
 * met een capaciteit per dag die over alle toetsen wordt gedeeld: een toets
 * met een vroege deadline claimt zijn dagen eerst, een latere toets krijgt
 * wat er op die dagen nog over is.
 */
export function berekenNakijkplanning(
  items: ToetsItem[],
  instellingen: ToetsweekInstellingen,
): NakijkplanningResultaat {
  // Lege cijferdeadline: reken met de standaard (10 werkdagen na de toets), zoals de UI belooft.
  const metDeadline = items
    .filter((item) => valideerItem(item).length === 0 && item.nakijkminuten > 0)
    .map((item) =>
      item.cijferdeadline.trim()
        ? item
        : { ...item, cijferdeadline: standaardCijferdeadline(item.datum, instellingen) },
    );
  const geldig = metDeadline.filter((item) => isGeldigeDatum(item.cijferdeadline));
  const gesorteerd = [...geldig].sort((a, b) => a.cijferdeadline.localeCompare(b.cijferdeadline));
  const capaciteit = new Map<string, number>();
  const toewijzingenPerDag = new Map<string, NakijkToewijzing[]>();
  const tekorten: NakijkTekort[] = [];

  for (const item of gesorteerd) {
    let resterend = item.aantalLeerlingen * item.nakijkminuten;
    const start = voegDagenToe(item.datum, 1);
    const eindeVenster = voegDagenToe(item.cijferdeadline, -1);
    let dag = start;
    let stappen = 0;
    while (resterend > 0 && dag <= eindeVenster && stappen < MAX_HORIZON_DAGEN) {
      stappen++;
      if (isVrijeDag(dag, instellingen)) {
        dag = voegDagenToe(dag, 1);
        continue;
      }
      if (!capaciteit.has(dag)) capaciteit.set(dag, instellingen.nakijkminutenPerDag);
      const beschikbaar = capaciteit.get(dag) ?? 0;
      if (beschikbaar > 0) {
        const inzet = Math.min(beschikbaar, resterend);
        capaciteit.set(dag, beschikbaar - inzet);
        resterend -= inzet;
        const lijst = toewijzingenPerDag.get(dag) ?? [];
        lijst.push({
          toetsId: item.id,
          minuten: inzet,
          ongeveerLeerlingen: Math.max(1, Math.round(inzet / item.nakijkminuten)),
        });
        toewijzingenPerDag.set(dag, lijst);
      }
      dag = voegDagenToe(dag, 1);
    }
    if (resterend > 0) {
      const beschikbareDagen = telWerkdagenTussen(start, eindeVenster, instellingen);
      const beschrijving = item.naam.trim() ? item.naam.trim() : `de ${item.soort} ${item.vak}`;
      const basis =
        `Voor ${beschrijving} (${item.klas}) kom je ${resterend} minuten nakijktijd`
        + ` tekort vóór de cijferdeadline van ${dagnaam(item.cijferdeadline)}.`;
      const suggestie =
        beschikbareDagen > 0
          ? ` Kies een latere cijferdeadline, of maak ${Math.ceil(resterend / beschikbareDagen)}`
            + ` minuten per dag extra vrij.`
          : ` Er is geen dag beschikbaar vóór de deadline. Kies een latere cijferdeadline.`;
      tekorten.push({ toetsId: item.id, tekortMinuten: resterend, melding: basis + suggestie });
    }
  }

  const dagen: NakijkDagPlanning[] = [...toewijzingenPerDag.entries()]
    .map(([datum, toewijzingen]) => ({ datum, toewijzingen }))
    .sort((a, b) => a.datum.localeCompare(b.datum));

  const perWeek = new Map<string, NakijkWeekBelasting>();
  for (const dagPlanning of dagen) {
    const week = isoWeekVanDatum(dagPlanning.datum);
    const sleutel = isoWeekSleutel(week);
    const minutenDezeDag = dagPlanning.toewijzingen.reduce((som, t) => som + t.minuten, 0);
    const bestaand = perWeek.get(sleutel);
    if (bestaand) bestaand.minuten += minutenDezeDag;
    else perWeek.set(sleutel, { jaar: week.jaar, week: week.week, minuten: minutenDezeDag });
  }
  const totaalPerWeek = [...perWeek.values()].sort((a, b) => a.jaar - b.jaar || a.week - b.week);

  return { dagen, tekorten, totaalPerWeek };
}
