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
  MAX_WOORDEN_PER_DEFINITIE_BULLET,
} from "./slide-content-rules";

/* ------------------------------------------------------------------ */
/* Begrippen-extractie                                                 */
/* ------------------------------------------------------------------ */

/**
 * Stopwoorden voor de fallback-extractie: veelgebruikte Nederlandse
 * onderwijs-werkwoorden en functiewoorden uit typische leerdoel-formuleringen
 * ("je kunt uitleggen/opnoemen/benoemen wat de begrippen ... betekenen/
 * inhouden en hoe deze de ... beïnvloeden"). Dit is een veiligheidsnet: als
 * de primaire regex-match faalt, mag de fallback NOOIT een van deze woorden
 * als kernbegrip aanzien, ook al is het > 6 letters.
 */
const STOPWOORDEN_FALLBACK = new Set(
  [
    "opnoemen", "uitleggen", "benoemen", "beschrijven", "toelichten",
    "verklaren", "analyseren", "beoordelen", "onderbouwen", "toepassen",
    "herkennen", "vergelijken", "samenvatten", "formuleren", "motiveren",
    "onderzoeken", "beargumenteren", "illustreren", "definiëren", "duiden",
    "begrippen", "begrip", "leerdoel", "leerdoelen", "kunnen", "kunt",
    "kan", "moet", "moeten", "leerling", "leerlingen", "student",
    "studenten", "maatschappelijke", "maatschappijleer", "problemen",
    "probleem", "vraagstuk", "vraagstukken", "betekenen", "betekent",
    "inhouden", "inhoudt", "voorstellen", "omvatten", "invloed",
    "beïnvloeden", "beinvloeden", "hoofdstuk", "paragraaf", "onderwerp",
    "onderwerpen", "context", "situatie", "voorbeeld", "voorbeelden",
    "verband", "verbanden", "gevolgen", "oorzaken", "aanleiding",
  ].map((w) => w.toLowerCase())
);

/**
 * Probeert kernbegrippen uit een vrij ingevoerd leerdoel te halen, bv.
 * "...wat de begrippen referentiekader, selectieve waarneming en framing
 * betekenen..." -> ["referentiekader", "selectieve waarneming", "framing"]
 *
 * Ondersteunt meerdere veelgebruikte werkwoordsvormen naast
 * betekent/betekenen (inhouden/inhoudt, zijn, voorstellen, omvatten),
 * omdat docenten leerdoelen op verschillende manieren formuleren, bv.
 * "wat de begrippen X, Y en Z inhouden" of "...wat X, Y en Z zijn".
 */
export function extraheerBegrippen(leerdoel: string): string[] {
  const tekst = leerdoel.trim();
  const werkwoorden = "betekenen|betekent|inhouden|inhoudt|zijn|voorstellen|omvatten";
  const patroon = new RegExp(`begrippen?\\s+(.+?)\\s+(?:${werkwoorden})\\b`, "i");
  const match = tekst.match(patroon);
  const ruw = match ? match[1] : null;

  let lijst: string[] = [];
  if (ruw) {
    lijst = ruw
      .split(/,| en /gi)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (lijst.length < 2) {
    // veiligheidsnet: pak zelfstandige-naamwoord-achtige woorden > 6 letters
    // als gok, maar sluit bekende werkwoorden/functiewoorden expliciet uit
    // zodat de fallback nooit een werkwoord als kernbegrip aanziet.
    lijst = Array.from(
      new Set(
        tekst
          .split(/[\s,]+/)
          .filter(
            (w) =>
              w.length > 6 &&
              /^[a-zA-ZÀ-ÿ]+$/.test(w) &&
              !STOPWOORDEN_FALLBACK.has(w.toLowerCase())
          )
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
/* Terugblik / activering voorkennis (EDI-fase 1, NIEUW)                */
/* Korte herinneringsvraag/aanknopingspunt bij voorkennis, vak-specifiek */
/* waar mogelijk — kort en concreet, geen open discussie.               */
/* ------------------------------------------------------------------ */

function bouwTerugblik(vak: Vak, begrippen: string[], isEersteLes: boolean): string[] {
  const eerste = begrippen[0] ?? "kernbegrip";

  const terugblikMap: Record<Vak, string[]> = {
    Maatschappijleer: [
      "Denk terug: laatste nieuwsbericht dat je las",
      "Wie bepaalde wat jij zag/las?",
      `Herinner je nog iets over ${eerste}?`,
    ],
    Geschiedenis: [
      "Denk terug aan vorige les: welk jaartal/gebeurtenis?",
      "Wat veranderde toen in de samenleving?",
      `Herinner je nog iets over ${eerste}?`,
    ],
    Economie: [
      "Denk terug: laatste keer dat je iets kocht",
      "Wat bepaalde de prijs die je betaalde?",
      `Herinner je nog iets over ${eerste}?`,
    ],
    Aardrijkskunde: [
      "Denk terug: een plek die drastisch veranderde",
      "Wat was de oorzaak van die verandering?",
      `Herinner je nog iets over ${eerste}?`,
    ],
  };

  const openingsRegel = isEersteLes
    ? "Korte activeringsvraag klassikaal (2 min)"
    : "Terugblik op vorige les (2 min)";

  return afdwingenSlideRegels([openingsRegel, ...terugblikMap[vak]]);
}

/* ------------------------------------------------------------------ */
/* Begeleide inoefening + check-for-understanding (EDI-fase 4, NIEUW)   */
/* Korte, snelle controlevraag die de docent klassikaal stelt vóórdat  */
/* leerlingen zelfstandig aan de slag gaan — kort/concreet, geen open  */
/* discussie (bv. quizvraag of duim-omhoog/omlaag-check).               */
/* ------------------------------------------------------------------ */

function bouwBegeleideInoefening(vak: Vak, begrippen: string[]): string[] {
  const eerste = begrippen[0] ?? "kernbegrip";
  const tweede = begrippen[1] ?? begrippen[0] ?? "ander begrip";

  return afdwingenSlideRegels([
    "Samen kort oefenen (5 min, docent begeleidt)",
    `Check: herken je ${eerste} in dit voorbeeld?`,
    "Duim omhoog/omlaag: snap je het?",
    `Snelle vraag: noem één kenmerk van ${tweede}`,
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
        titel: trimTitel("1. Terugblik & activering"),
        duur: 3,
        inhoud: bouwTerugblik(input.vak, groep, idx === 0),
      },
      {
        titel: trimTitel("2. Leerdoel & kernbegrippen"),
        duur: 8,
        inhoud: afdwingenSlideRegels(
          [
            idx === 0 ? "Leerdoel van deze les(senreeks)" : "Herhaling + nieuwe kernbegrippen",
            ...groep.map((b) => `${b[0].toUpperCase()}${b.slice(1)}: ${definieer(b, input.vak)}`),
          ],
          {
            maxBullets: groep.length + 1,
            // "Label: definitie"-bullets zijn geen losse actie-bullets — een
            // definitie mag tot MAX_DEFINITIE_WOORDEN woorden zijn, dus het
            // label + definitie samen hebben een eigen, hogere limiet nodig.
            // Anders knipt de generieke 7-woorden-regel de definitie af
            // vóórdat hij een complete gedachte vormt (bug 3).
            maxWoordenPerBullet: MAX_WOORDEN_PER_DEFINITIE_BULLET,
            maxTotaalWoorden: (groep.length + 1) * MAX_WOORDEN_PER_DEFINITIE_BULLET,
          }
        ),
      },
      {
        titel: trimTitel("3. Casus met concrete cijfers"),
        duur: 12,
        inhoud: bouwCasus(input.vak, groep, input.niveau),
      },
      {
        titel: trimTitel("4. Uitgewerkt voorbeeld (klassikaal, docent modelt)"),
        duur: 8,
        inhoud: bouwUitgewerktVoorbeeld(input.vak, groep),
      },
      {
        titel: trimTitel("5. Begeleide inoefening & check-for-understanding"),
        duur: 5,
        inhoud: bouwBegeleideInoefening(input.vak, groep),
      },
      {
        titel: trimTitel("6. Opdracht in tweetallen"),
        duur: 15,
        inhoud: bouwOpdracht(groep),
      },
      {
        titel: trimTitel("7. Bespreken (plenair)"),
        duur: 7,
        inhoud: bouwBespreken(),
      },
      {
        titel: trimTitel(isLaatsteLes ? "8. Huiswerk & vooruitblik toets" : "8. Huiswerk"),
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
