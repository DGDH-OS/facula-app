import type {
  Vak,
  Niveau,
  LessonInput,
  GeneratedLesson,
  LessonPart,
  LessonSection,
} from "./types";
import {
  afdwingenSlideRegels,
  afdwingenDefinitie,
  trimTitel,
} from "./slide-content-rules";

/* ------------------------------------------------------------------ */
/* Begrippen-extractie                                                 */
/* ------------------------------------------------------------------ */

/**
 * Probeert kernbegrippen uit een vrij ingevoerd leerdoel te halen, bv.
 * "...wat de begrippen referentiekader, selectieve waarneming en framing
 * betekenen..." -> ["referentiekader", "selectieve waarneming", "framing"]
 */
export function extraheerBegrippen(leerdoel: string): string[] {
  const tekst = leerdoel.trim();
  const match = tekst.match(/begrippen?\s+(.+?)\s+betekent|begrippen?\s+(.+?)\s+betekenen/i);
  const ruw = match ? (match[1] ?? match[2]) : null;

  let lijst: string[] = [];
  if (ruw) {
    lijst = ruw
      .split(/,| en /gi)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (lijst.length < 2) {
    // fallback: pak zelfstandige naamwoorden-achtige woorden > 5 letters als gok
    lijst = Array.from(
      new Set(
        tekst
          .split(/[\s,]+/)
          .filter((w) => w.length > 6 && /^[a-zA-ZÀ-ÿ]+$/.test(w))
      )
    ).slice(0, 6);
  }

  return lijst.map((s) => s.replace(/\.$/, "").trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* Begrippendefinities — bekende termen per vak, plus generieke fallback */
/* Elke definitie is 1 losse, korte kernzin (zie PRESENTATIE-METHODIEK.md: */
/* DEFINITIONS_AS_SINGLE_SENTENCE) — geen lijst van volzinnen.            */
/* ------------------------------------------------------------------ */

const DEFINITIES: Record<string, string> = {
  referentiekader: "eigen waarden en ervaringen kleuren je interpretatie",
  "selectieve waarneming": "onbewust vooral zien wat je al verwacht",
  desinformatie: "bewust onjuiste, misleidende informatie",
  manipulatie: "oneerlijk beïnvloeden van mening of gedrag",
  polarisatie: "standpunten groeien steeds verder uit elkaar",
  framing: "boodschap ingekleed voor gewenste interpretatie",
};

const GENERIEKE_VAKTERMEN: Record<Vak, string[]> = {
  Maatschappijleer: [
    "referentiekader",
    "selectieve waarneming",
    "desinformatie",
    "manipulatie",
    "polarisatie",
    "framing",
  ],
  Geschiedenis: [
    "bronkritiek",
    "causaliteit",
    "continuïteit en verandering",
    "historisch perspectief",
    "periodisering",
  ],
  Economie: [
    "vraag en aanbod",
    "schaarste",
    "conjunctuur",
    "marktevenwicht",
    "elasticiteit",
  ],
  Aardrijkskunde: [
    "push- en pullfactoren",
    "duurzaamheid",
    "ruimtelijke ordening",
    "verstedelijking",
    "draagvlak",
  ],
};

function definieer(begrip: string, vak: Vak): string {
  const key = begrip.toLowerCase().trim();
  if (DEFINITIES[key]) return afdwingenDefinitie(DEFINITIES[key]);
  return afdwingenDefinitie(`kernbegrip binnen ${vak.toLowerCase()}, leg uit met voorbeeld`);
}

/* ------------------------------------------------------------------ */
/* Casus met concrete cijfers — per vak, generiek herbruikbaar          */
/* Fragmenten/labels, geen volzinnen — docent vult mondeling aan.       */
/* ------------------------------------------------------------------ */

function bouwCasus(vak: Vak, begrippen: string[], niveau: Niveau): string[] {
  const eerste = begrippen[0] ?? "kernbegrip";
  const tweede = begrippen[1] ?? begrippen[0] ?? "ander begrip";

  const casusMap: Record<Vak, string[]> = {
    Maatschappijleer: [
      "68% jongeren: nieuws via social media",
      "Emotionele titel: 4,2x meer weergaven",
      "55% deelt nieuws zonder bron te checken",
      `Vraag: rol van ${eerste} en ${tweede}?`,
    ],
    Geschiedenis: [
      "Europese bevolking: 290 → 460 miljoen (1870-1914)",
      "Koloniaal bezit Afrika: 10% → 90%",
      "Bronnen: kranten, redevoeringen, kaarten",
      `Vraag: hoe helpen ${eerste} en ${tweede}?`,
    ],
    Economie: [
      "Inflatie 4,1% vs. cao-stijging 6,2% (2023)",
      "Prijs +8% → gevraagde hoeveelheid -3%",
      "ECB-rente: 0% → 4,5%",
      `Vraag: wat verklaren ${eerste} en ${tweede}?`,
    ],
    Aardrijkskunde: [
      "Wereldbevolking steden: 2,9 → 4,4 miljard",
      "Nieuwe wijk: 3.500 woningen, infra -15%",
      "Enquête: 42% voor, 38% tegen, 20% neutraal",
      `Vraag: rol van ${eerste} en ${tweede}?`,
    ],
  };

  const niveauLabel: Record<Niveau, string> = {
    vwo: "Extra: correlatie ≠ oorzaak-gevolg",
    havo: "Eerst kort samenvatten in eigen woorden",
    "vmbo-t": "Ondersteun met staafdiagram",
  };

  return afdwingenSlideRegels([...casusMap[vak].slice(0, 3), niveauLabel[niveau]]);
}

/* ------------------------------------------------------------------ */
/* Uitgewerkt voorbeeld                                                 */
/* ------------------------------------------------------------------ */

function bouwUitgewerktVoorbeeld(vak: Vak, begrippen: string[]): string[] {
  const term = begrippen[0] ?? "kernbegrip";
  return afdwingenSlideRegels([
    "Kies voorbeeld: nieuwsbericht, bron of plan",
    "Stap 1: benoem de feiten/cijfers",
    `Stap 2: herken ${term} hierin`,
    "Stap 3: leg link naar vraagstuk",
  ]);
}

/* ------------------------------------------------------------------ */
/* Opdracht, bespreken, huiswerk                                        */
/* ------------------------------------------------------------------ */

function bouwOpdracht(begrippen: string[]): string[] {
  const lijst = begrippen.slice(0, 2);
  return afdwingenSlideRegels([
    `Kies twee begrippen: ${lijst.join(", ")}`,
    "Zoek eigen actueel voorbeeld",
    "Beschrijf kort: wat, begrip, gevolg",
    "Tijd: 12-15 minuten",
  ]);
}

function bouwBespreken(): string[] {
  return afdwingenSlideRegels([
    "2-3 duo's delen voorbeeld (max 1 min)",
    "Vraag: eens met deze toepassing?",
    "Docent vat begrippen en samenhang samen",
    "Terug naar kernvraag van de les",
  ]);
}

function bouwHuiswerk(vak: Vak, begrippen: string[]): string[] {
  const term = begrippen[0] ?? "kernbegrip";
  return afdwingenSlideRegels([
    `Zoek bron (${vak.toLowerCase()}) met ${term}`,
    "Schrijf kort: bron, begrip, vraagstuk",
    "Neem bron mee naar volgende les",
  ]);
}

/* ------------------------------------------------------------------ */
/* Hoofdgenerator                                                       */
/* ------------------------------------------------------------------ */

function titelVoorLes(input: LessonInput): string {
  return trimTitel(
    `${input.vak} — ${input.niveau.toUpperCase()} ${input.leerjaar}: les over ${input.leerdoel
      .split(" ")
      .slice(0, 6)
      .join(" ")}...`
  );
}

export function genereerLes(input: LessonInput): GeneratedLesson {
  const begrippen = extraheerBegrippen(input.leerdoel);
  const aantalLessen = Math.max(1, input.aantalLessen);

  // verdeel begrippen zo gelijk mogelijk over de lessen
  const perLes: string[][] = Array.from({ length: aantalLessen }, () => []);
  begrippen.forEach((b, i) => {
    perLes[i % aantalLessen].push(b);
  });
  // zorg dat elke les minstens 1 begrip heeft
  perLes.forEach((groep, i) => {
    if (groep.length === 0) groep.push(begrippen[i % begrippen.length] ?? "kernbegrip");
  });

  const onderdelen: LessonPart[] = perLes.map((groep, idx) => {
    const isLaatsteLes = idx === aantalLessen - 1;
    const secties: LessonSection[] = [
      {
        titel: trimTitel("1. Leerdoel & kernbegrippen"),
        duur: 8,
        inhoud: afdwingenSlideRegels(
          [
            idx === 0 ? "Leerdoel van deze les(senreeks)" : "Herhaling + nieuwe kernbegrippen",
            ...groep.map((b) => `${b[0].toUpperCase()}${b.slice(1)}: ${definieer(b, input.vak)}`),
          ],
          { maxBullets: groep.length + 1 }
        ),
      },
      {
        titel: trimTitel("2. Casus met concrete cijfers"),
        duur: 12,
        inhoud: bouwCasus(input.vak, groep, input.niveau),
      },
      {
        titel: trimTitel("3. Uitgewerkt voorbeeld (klassikaal, docent modelt)"),
        duur: 8,
        inhoud: bouwUitgewerktVoorbeeld(input.vak, groep),
      },
      {
        titel: trimTitel("4. Opdracht in tweetallen"),
        duur: 15,
        inhoud: bouwOpdracht(groep),
      },
      {
        titel: trimTitel("5. Bespreken (plenair)"),
        duur: 7,
        inhoud: bouwBespreken(),
      },
      {
        titel: trimTitel(isLaatsteLes ? "6. Huiswerk & vooruitblik toets" : "6. Huiswerk"),
        duur: 0,
        inhoud: isLaatsteLes
          ? afdwingenSlideRegels([
              ...bouwHuiswerk(input.vak, groep),
              "Vooruitblik: toets sluit aan op leerdoelen",
            ])
          : bouwHuiswerk(input.vak, groep),
      },
    ];

    return {
      nummer: idx + 1,
      titel: `Les ${idx + 1} van ${aantalLessen}${aantalLessen > 1 ? ` — ${input.vak}` : ""}`,
      duur: input.lesduur,
      secties,
    };
  });

  return {
    id: `les-${Date.now()}`,
    createdAt: new Date().toISOString(),
    input,
    titel: titelVoorLes(input),
    kernbegrippen: begrippen,
    onderdelen,
  };
}

export { GENERIEKE_VAKTERMEN };
