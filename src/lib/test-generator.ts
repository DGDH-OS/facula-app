import type {
  Vak,
  TestInput,
  GeneratedTest,
  ToetsVraag,
  MeerkeuzeOptie,
} from "./types";
import { extraheerBegrippen } from "./lesson-generator";

const DEFINITIES: Record<string, string> = {
  referentiekader:
    "het geheel van waarden, normen, ervaringen en kennis waarmee iemand de werkelijkheid interpreteert en beoordeelt.",
  "selectieve waarneming":
    "het onbewust vooral opmerken van informatie die past bij wat je al denkt of verwacht, en het negeren van informatie die daarmee in strijd is.",
  desinformatie:
    "informatie die doelbewust onjuist of misleidend is, met als doel mensen op het verkeerde been te zetten.",
  manipulatie:
    "het bewust beïnvloeden van iemands mening of gedrag door oneerlijke of misleidende middelen.",
  polarisatie:
    "het proces waarbij standpunten van groepen steeds verder uit elkaar gaan liggen.",
  framing:
    "de manier waarop een boodschap wordt ingekleed, waardoor het publiek een bepaalde interpretatie krijgt aangereikt.",
};

function definieer(begrip: string, vak: Vak): string {
  const key = begrip.toLowerCase().trim();
  if (DEFINITIES[key]) return DEFINITIES[key];
  return `een kernbegrip binnen ${vak.toLowerCase()}.`;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function bouwMeerkeuzeVraag(
  nummer: number,
  begrip: string,
  begrippenPool: string[],
  vak: Vak
): ToetsVraag {
  const juisteDefinitie = definieer(begrip, vak);
  const afleiders = shuffle(begrippenPool.filter((b) => b !== begrip))
    .slice(0, 3)
    .map((b) => definieer(b, vak));

  // vul aan met generieke afleiders als er niet genoeg zijn
  while (afleiders.length < 3) {
    afleiders.push(
      "het proces waarbij feiten en meningen door elkaar worden gebruikt zonder onderscheid te maken."
    );
  }

  const opties: MeerkeuzeOptie[] = shuffle([
    { tekst: juisteDefinitie, correct: true },
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
    vraag: `Welke omschrijving hoort bij het begrip "${begrip}"?`,
    punten: 1,
    opties,
    antwoordsleutel: `${correcteLabel} — ${juisteDefinitie}`,
  };
}

function bouwOpenVraag(nummer: number, begrip: string, vak: Vak): ToetsVraag {
  return {
    nummer,
    type: "open",
    vraag: `Leg in je eigen woorden uit wat "${begrip}" betekent en geef een concreet voorbeeld uit een actuele situatie binnen ${vak.toLowerCase()}.`,
    punten: 3,
    antwoordsleutel: `Volledig antwoord (3 pt): correcte uitleg van het begrip ("${definieer(
      begrip,
      vak
    )}") + een passend, concreet en actueel voorbeeld. Gedeeltelijk (1-2 pt): definitie correct maar voorbeeld ontbreekt/onjuist, of andersom. 0 pt: geen relevante uitleg.`,
  };
}

function bouwInvulvraag(nummer: number, begrip: string): ToetsVraag {
  const zinnen: Record<string, string> = {
    referentiekader:
      "Iemands ___________ bepaalt door welke bril hij of zij het nieuws beoordeelt.",
    "selectieve waarneming":
      "Doordat mensen last hebben van ___________, onthouden ze vooral berichten die hun mening bevestigen.",
    desinformatie:
      "Een bericht dat doelbewust onjuiste feiten verspreidt om mensen te misleiden, noemen we ___________.",
    manipulatie:
      "Wanneer iemand bewust misleidende technieken gebruikt om jouw mening te sturen, is er sprake van ___________.",
    polarisatie:
      "Wanneer standpunten in de samenleving steeds verder uit elkaar gaan liggen, spreken we van ___________.",
    framing:
      "De manier waarop een bericht wordt ingekleed, zodat het publiek een bepaalde interpretatie krijgt aangereikt, heet ___________.",
  };
  const key = begrip.toLowerCase();
  const zin =
    zinnen[key] ??
    `Het begrip dat hoort bij de omschrijving "${definieer(
      begrip,
      "Maatschappijleer" as Vak
    )}" is: ___________.`;

  return {
    nummer,
    type: "invulvraag",
    vraag: zin,
    punten: 1,
    antwoordsleutel: begrip,
  };
}

function titelVoorTest(input: TestInput): string {
  return `Toets ${input.vak} — ${input.niveau.toUpperCase()} ${input.leerjaar}`;
}

export function genereerToets(input: TestInput): GeneratedTest {
  const begrippenUitLeerdoel = extraheerBegrippen(input.leerdoel);
  const extraBegrippen = input.kernbegrippen
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const alleBegrippen = Array.from(
    new Set([...begrippenUitLeerdoel, ...extraBegrippen])
  );
  const pool = alleBegrippen.length > 0 ? alleBegrippen : ["kernbegrip"];

  const aantal = Math.max(3, input.aantalVragen);
  const vragen: ToetsVraag[] = [];
  let nummer = 1;

  // Verdeel vraagtypes: ~40% meerkeuze, ~30% open, ~30% invulvraag
  for (let i = 0; i < aantal; i++) {
    const begrip = pool[i % pool.length];
    const rest = i % 3;
    if (rest === 0) {
      vragen.push(bouwMeerkeuzeVraag(nummer, begrip, pool, input.vak));
    } else if (rest === 1) {
      vragen.push(bouwOpenVraag(nummer, begrip, input.vak));
    } else {
      vragen.push(bouwInvulvraag(nummer, begrip));
    }
    nummer++;
  }

  // Slotvraag: koppel begrippen aan maatschappelijk probleem (open, hoger denkniveau)
  vragen.push({
    nummer,
    type: "open",
    vraag: `Kies twee van de behandelde begrippen (${pool
      .slice(0, 4)
      .join(", ")}) en leg uit hoe deze samen een maatschappelijk probleem kunnen verklaren of versterken.`,
    punten: 4,
    antwoordsleutel:
      "Volledig antwoord (4 pt): beide begrippen correct uitgelegd + een logisch onderbouwd verband met een concreet maatschappelijk probleem. Gedeeltelijk (2-3 pt): begrippen correct maar verband zwak onderbouwd. 0-1 pt: begrippen onjuist of geen verband gelegd.",
  } as ToetsVraag);

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
