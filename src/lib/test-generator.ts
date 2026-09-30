import type {
  Vak,
  TestInput,
  GeneratedTest,
  ToetsVraag,
  MeerkeuzeOptie,
  ToetsBron,
} from "./types";
import { extraheerBegrippen } from "./lesson-generator";
import { parseBoekBegrippen, type BoekBegrip } from "./boek-begrippen";
import { parseVoorbeeldToets } from "./voorbeeldtoets";
import { controleerAfstemming } from "./constructive-alignment";

/**
 * Alle definities, antwoordsleutels en afleiders komen woordelijk uit het
 * lesboek van de docent (boekBegrippen). Facula verzint geen inhoud: zonder
 * aangeleverde definitie komt er geen meerkeuze- of invulvraag, alleen een
 * open vraag waarvan de sleutel naar het lesboek verwijst.
 */
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const ZIE_BOEK = "Beoordeel aan de hand van de definitie in het lesboek.";

function bouwMeerkeuzeVraag(
  nummer: number,
  item: BoekBegrip,
  metDefinitie: BoekBegrip[]
): ToetsVraag {
  const afleiders = shuffle(metDefinitie.filter((b) => b.begrip !== item.begrip))
    .slice(0, 3)
    .map((b) => b.definitie);

  const opties: MeerkeuzeOptie[] = shuffle([
    { tekst: item.definitie, correct: true },
    ...afleiders.map((d) => ({ tekst: d, correct: false })),
  ]).map((o, i) => ({
    label: String.fromCharCode(65 + i), // A, B, C, D
    tekst: o.tekst,
    correct: o.correct,
  }));

  const correcteLabel = opties.find((o) => o.correct)!.label;

  return {
    nummer,
    type: "meerkeuze",
    vraag: `Welke omschrijving hoort bij het begrip "${item.begrip}"?`,
    punten: 1,
    opties,
    antwoordsleutel: `${correcteLabel}: ${item.definitie}`,
  };
}

function bouwOpenVraag(nummer: number, item: BoekBegrip, vak: Vak): ToetsVraag {
  const sleutel = item.definitie
    ? `Volledig antwoord (3 pt): uitleg die klopt met het lesboek ("${item.definitie}") + een passend, concreet voorbeeld. Gedeeltelijk (1-2 pt): uitleg klopt maar voorbeeld ontbreekt/onjuist, of andersom. 0 pt: geen relevante uitleg.`
    : `Volledig antwoord (3 pt): uitleg die klopt met het lesboek + een passend, concreet voorbeeld. ${ZIE_BOEK} Gedeeltelijk (1-2 pt): uitleg klopt maar voorbeeld ontbreekt/onjuist, of andersom. 0 pt: geen relevante uitleg.`;
  return {
    nummer,
    type: "open",
    vraag: `Leg in je eigen woorden uit wat "${item.begrip}" betekent en geef een concreet voorbeeld binnen ${vak.toLowerCase()}.`,
    punten: 3,
    antwoordsleutel: sleutel,
  };
}

function bouwInvulvraag(nummer: number, item: BoekBegrip): ToetsVraag {
  return {
    nummer,
    type: "invulvraag",
    vraag: `Welk begrip hoort bij deze omschrijving: "${item.definitie}"? ___________`,
    punten: 1,
    antwoordsleutel: item.begrip,
  };
}

function sleutelBron(items: BoekBegrip[]): string {
  const defs = items
    .filter((b) => b.definitie)
    .map((b) => `${b.begrip}: "${b.definitie}"`)
    .join("; ");
  return `${
    defs ? `Lesboek: ${defs}. ` : ""
  }Beoordeel aan de hand van de bron en het lesboek. 1p: begrip(pen) juist uitgelegd. 1p: duidelijke koppeling met een fragment uit de bron.`;
}

function bouwBronVragen(start: number, pool: BoekBegrip[]): ToetsVraag[] {
  const echte = pool.filter((b) => b.begrip !== "kernbegrip");
  const vragen: ToetsVraag[] = [];
  let nr = start;
  for (const item of echte.slice(0, 3)) {
    vragen.push({
      nummer: nr++,
      type: "open",
      bron: 1,
      vraag: `Gebruik bron 1. Leg aan de hand van de bron uit hoe het begrip "${item.begrip}" hierin naar voren komt.`,
      punten: 2,
      antwoordsleutel: sleutelBron([item]),
    });
  }
  const metDef = echte.filter((b) => b.definitie);
  if (metDef.length >= 2) {
    const doel = metDef[0];
    const afleiders = metDef.slice(1, 4);
    const opties: MeerkeuzeOptie[] = shuffle([
      { tekst: doel.definitie, correct: true },
      ...afleiders.map((b) => ({ tekst: b.definitie, correct: false })),
    ]).map((o, i) => ({ label: String.fromCharCode(65 + i), tekst: o.tekst, correct: o.correct }));
    const label = opties.find((o) => o.correct)!.label;
    vragen.push({
      nummer: nr++,
      type: "meerkeuze",
      bron: 1,
      vraag: `Gebruik bron 1. Welke omschrijving past bij het begrip "${doel.begrip}" zoals dat in de bron voorkomt?`,
      punten: 1,
      opties,
      antwoordsleutel: `${label}: ${doel.definitie}`,
    });
  }
  if (echte.length >= 2) {
    const [a, b] = echte;
    vragen.push({
      nummer: nr++,
      type: "open",
      bron: 1,
      vraag: `Gebruik bron 1. Leg de relatie uit tussen de begrippen "${a.begrip}" en "${b.begrip}" aan de hand van de bron.`,
      punten: 2,
      antwoordsleutel: sleutelBron([a, b]),
    });
  }
  return vragen;
}

function titelVoorTest(input: TestInput): string {
  return `Toets ${input.vak}, ${input.niveau.toUpperCase()} ${input.leerjaar}`;
}

export function genereerToets(input: TestInput): GeneratedTest {
  const boek = parseBoekBegrippen(input.boekBegrippen);
  const extraBegrippen = input.kernbegrippen
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Volgorde: lesboek eerst (met definities), daarna handmatige begrippen,
  // en alleen zonder beide een gok uit het leerdoel (zonder definitie).
  const bekend = new Set(boek.map((b) => b.begrip.toLowerCase()));
  const zonderDef: BoekBegrip[] = (
    extraBegrippen.length > 0 || boek.length > 0
      ? extraBegrippen
      : extraheerBegrippen(input.leerdoel)
  )
    .filter((b) => !bekend.has(b.toLowerCase()))
    .map((begrip) => ({ begrip, definitie: "" }));

  const items: BoekBegrip[] = [...boek, ...zonderDef];
  const pool = items.length > 0 ? items : [{ begrip: "kernbegrip", definitie: "" }];
  const metDefinitie = pool.filter((b) => b.definitie);

  const eigen = parseVoorbeeldToets(input.eigenVragen);
  const aantal = eigen.length > 0 ? 0 : Math.max(3, input.aantalVragen);
  const vragen: ToetsVraag[] = [];
  let nummer = 1;
  for (const v of eigen) {
    vragen.push({ ...v, nummer });
    nummer++;
  }

  for (let i = 0; i < aantal; i++) {
    const item = pool[i % pool.length];
    const rest = i % 3;
    if (rest === 0 && item.definitie && metDefinitie.length >= 2) {
      vragen.push(bouwMeerkeuzeVraag(nummer, item, metDefinitie));
    } else if (rest === 2 && item.definitie) {
      vragen.push(bouwInvulvraag(nummer, item));
    } else {
      vragen.push(bouwOpenVraag(nummer, item, input.vak));
    }
    nummer++;
  }

  // Bronvragen: alleen met een bron die de docent zelf aanleverde (een echt
  // nieuwsartikel). De vragen gaan over de kernbegrippen uit het lesboek en
  // verwijzen naar de bron; de bron zelf wordt nooit door Facula gemaakt.
  const bronTekst = (input.bronTekst ?? "").trim();
  const bronVermelding = (input.bronVermelding ?? "").trim();
  const bronnen: ToetsBron[] = [];
  if (bronTekst && bronVermelding) {
    bronnen.push({ nummer: 1, tekst: bronTekst, vermelding: bronVermelding });
    const bronVragen = bouwBronVragen(nummer, pool);
    vragen.push(...bronVragen);
    nummer += bronVragen.length;
  }

  // Slotvraag: koppel begrippen aan maatschappelijk probleem (open, hoger denkniveau)
  if (eigen.length === 0) vragen.push({
    nummer,
    type: "open",
    vraag: `Kies twee van de behandelde begrippen (${pool
      .slice(0, 4)
      .map((b) => b.begrip)
      .join(", ")}) en leg uit hoe deze samen een maatschappelijk probleem kunnen verklaren of versterken.`,
    punten: 4,
    antwoordsleutel:
      "Volledig antwoord (4 pt): beide begrippen correct uitgelegd + een logisch onderbouwd verband met een concreet maatschappelijk probleem. Gedeeltelijk (2-3 pt): begrippen correct maar verband zwak onderbouwd. 0-1 pt: begrippen onjuist of geen verband gelegd.",
  } as ToetsVraag);

  // Constructive-alignment-check: elke vraag t.o.v. het leerdoel (zelfde
  // guardrail-patroon als avg-guardrails.ts). Resultaat wordt opgeslagen op
  // de vraag zodat het later in de UI getoond kan worden.
  for (const vraag of vragen) {
    vraag.alignment = controleerAfstemming(input.leerdoel, vraag.vraag);
  }

  const totaalPunten = vragen.reduce((sum, v) => sum + v.punten, 0);

  return {
    id: `toets-${Date.now()}`,
    createdAt: new Date().toISOString(),
    input,
    titel: titelVoorTest(input),
    bronnen: bronnen.length > 0 ? bronnen : undefined,
    vragen,
    totaalPunten,
    tijdsduur: Math.round(vragen.length * 3 + 10),
  };
}
