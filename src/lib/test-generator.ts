import type {
  Vak,
  TestInput,
  GeneratedTest,
  ToetsVraag,
  MeerkeuzeOptie,
} from "./types";
import { extraheerBegrippen } from "./lesson-generator";
import { parseBoekBegrippen, type BoekBegrip } from "./boek-begrippen";
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

  const aantal = Math.max(3, input.aantalVragen);
  const vragen: ToetsVraag[] = [];
  let nummer = 1;

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

  // Slotvraag: koppel begrippen aan maatschappelijk probleem (open, hoger denkniveau)
  vragen.push({
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
    vragen,
    totaalPunten,
    tijdsduur: Math.round(aantal * 3 + 10),
  };
}
