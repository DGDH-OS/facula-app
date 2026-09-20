import type {
  Vak,
  Niveau,
  LessonInput,
  GeneratedLesson,
  LessonPart,
  LessonSection,
} from "./types";

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
/* ------------------------------------------------------------------ */

const DEFINITIES: Record<string, string> = {
  referentiekader:
    "het geheel van waarden, normen, ervaringen en kennis waarmee iemand de werkelijkheid interpreteert en beoordeelt.",
  "selectieve waarneming":
    "het onbewust vooral opmerken van informatie die past bij wat je al denkt of verwacht, en het negeren van informatie die daarmee in strijd is.",
  desinformatie:
    "informatie die doelbewust onjuist of misleidend is, met als doel mensen op het verkeerde been te zetten.",
  manipulatie:
    "het bewust beïnvloeden van iemands mening of gedrag door oneerlijke of misleidende middelen, zonder dat diegene dat doorheeft.",
  polarisatie:
    "het proces waarbij standpunten van groepen steeds verder uit elkaar gaan liggen, waardoor het 'wij' en 'zij'-denken toeneemt.",
  framing:
    "de manier waarop een boodschap wordt ingekleed of gepresenteerd, waardoor het publiek een bepaalde interpretatie krijgt aangereikt.",
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
  if (DEFINITIES[key]) return DEFINITIES[key];
  return `een kernbegrip binnen ${vak.toLowerCase()} dat leerlingen nodig hebben om de casus in deze les goed te kunnen duiden — leg dit begrip in eigen woorden uit en illustreer met een actueel voorbeeld.`;
}

/* ------------------------------------------------------------------ */
/* Casus met concrete cijfers — per vak, generiek herbruikbaar          */
/* ------------------------------------------------------------------ */

function bouwCasus(vak: Vak, begrippen: string[], niveau: Niveau): string[] {
  const eerste = begrippen[0] ?? "het kernbegrip";
  const tweede = begrippen[1] ?? begrippen[0] ?? "een ander kernbegrip";

  const casusMap: Record<Vak, string[]> = {
    Maatschappijleer: [
      `Uit onderzoek van het CBS (2024) blijkt dat 68% van de 16- tot 24-jarigen dagelijks nieuws via social media tot zich neemt, tegenover 31% via een traditionele nieuwswebsite of krant.`,
      `Op een fictief social-media-platform bereikt een bericht met een emotionele, gepolariseerde titel gemiddeld 4,2 keer zoveel weergaven als een neutraal geformuleerd bericht over hetzelfde onderwerp.`,
      `In een klassikale peiling (n=180 leerlingen, 6 klassen) gaf 55% aan minstens één keer een nieuwsbericht te hebben gedeeld zonder de bron te controleren.`,
      `Laat leerlingen in tweetallen bepalen: welke rol spelen ${eerste} en ${tweede} in dit soort cijfers, en wat betekent dat voor hoe betrouwbaar informatie op social media is?`,
    ],
    Geschiedenis: [
      `Tussen 1870 en 1914 groeide de Europese bevolking van circa 290 naar 460 miljoen mensen — een stijging van bijna 60% in nog geen halve eeuw.`,
      `In dezelfde periode nam het aantal koloniale bezittingen van de grote Europese mogendheden in Afrika toe van ongeveer 10% van het continent (1870) naar meer dan 90% (1914).`,
      `Historici gebruiken bronnen uit deze periode (kranten, redevoeringen, kaarten) om te reconstrueren hoe tijdgenoten deze ontwikkeling beoordeelden.`,
      `Laat leerlingen in tweetallen bepalen: hoe helpen ${eerste} en ${tweede} bij het analyseren van deze bronnen en cijfers?`,
    ],
    Economie: [
      `De inflatie in Nederland bedroeg in 2023 gemiddeld 4,1%, terwijl de gemiddelde cao-loonstijging uitkwam op 6,2%.`,
      `Een supermarktketen verhoogt de prijs van een basisproduct met 8%; de gevraagde hoeveelheid daalt vervolgens met 3%.`,
      `In dezelfde periode steeg de rente van de ECB van 0% naar 4,5%, wat direct doorwerkte in hypotheeklasten van huishoudens.`,
      `Laat leerlingen in tweetallen bepalen: wat verklaren ${eerste} en ${tweede} over het gedrag van consumenten en producenten in dit voorbeeld?`,
    ],
    Aardrijkskunde: [
      `Tussen 2000 en 2023 groeide de wereldbevolking in steden van 2,9 miljard naar 4,4 miljard mensen — een toename van 52%.`,
      `In een fictieve middelgrote stad wordt een woonwijk gepland voor 3.500 nieuwe woningen, terwijl de bestaande infrastructuur berekend is op 15% minder verkeersbewegingen.`,
      `Een enquête onder bewoners laat zien dat 42% voorstander is van het plan, 38% tegen en 20% neutraal.`,
      `Laat leerlingen in tweetallen bepalen: welke rol spelen ${eerste} en ${tweede} bij het afwegen van dit soort ruimtelijke keuzes?`,
    ],
  };

  const niveauNoot =
    niveau === "vwo"
      ? "Vraag vwo-leerlingen expliciet om de causaliteit kritisch te bevragen: correlatie is niet automatisch oorzaak-gevolg."
      : niveau === "havo"
        ? "Laat havo-leerlingen de cijfers eerst in eigen woorden samenvatten voordat ze de vervolgvraag beantwoorden."
        : "Ondersteun met een visuele weergave van de cijfers (staafdiagram) voordat de vervolgvraag wordt gesteld.";

  return [...casusMap[vak], niveauNoot];
}

/* ------------------------------------------------------------------ */
/* Uitgewerkt voorbeeld                                                 */
/* ------------------------------------------------------------------ */

function bouwUitgewerktVoorbeeld(vak: Vak, begrippen: string[]): string[] {
  const term = begrippen[0] ?? "het kernbegrip";
  return [
    `Model hardop denkend voor: bekijk samen met de klas één concreet voorbeeld (bijvoorbeeld een nieuwsbericht, historische bron, prijsverandering of ruimtelijk plan) en laat zien hoe je ${term} hierin herkent.`,
    `Stap 1 — benoem wat je waarneemt (de feiten/cijfers).`,
    `Stap 2 — benoem welk kernbegrip hierop van toepassing is en waarom.`,
    `Stap 3 — leg de link naar het bredere maatschappelijke vraagstuk uit deze les.`,
    `Gebruik dit voorbeeld als hardop-denkmodel voordat leerlingen zelfstandig aan de slag gaan — dit voorkomt dat de opdracht te abstract blijft.`,
  ];
}

/* ------------------------------------------------------------------ */
/* Opdracht, bespreken, huiswerk                                        */
/* ------------------------------------------------------------------ */

function bouwOpdracht(begrippen: string[]): string[] {
  const lijst = begrippen.slice(0, 4);
  return [
    `Werk in tweetallen. Kies met je duo twee van de volgende kernbegrippen: ${lijst.join(", ")}.`,
    `Zoek of bedenk samen een eigen, actueel voorbeeld waarin deze begrippen zichtbaar zijn (uit het nieuws, social media, of je eigen omgeving).`,
    `Beschrijf in 4-6 zinnen: wat gebeurt er, welk begrip herken je, en wat is het maatschappelijke gevolg?`,
    `Tijd: circa 12-15 minuten. Loop als docent rond en stel verdiepingsvragen ("hoe weet je dat dit ${lijst[0] ?? "dit begrip"} is en niet iets anders?").`,
  ];
}

function bouwBespreken(): string[] {
  return [
    "Laat 2-3 tweetallen hun voorbeeld kort (max. 1 minuut per duo) plenair delen.",
    "Vraag de klas steeds: zijn jullie het eens met deze toepassing van het begrip? Waarom wel/niet?",
    "Vat aan het bord samen welke begrippen zijn langsgekomen en leg de onderlinge samenhang uit (bijvoorbeeld: hoe kan framing bijdragen aan polarisatie).",
    "Sluit af met de kernvraag van de les: wat heeft dit te maken met een groter maatschappelijk probleem?",
  ];
}

function bouwHuiswerk(vak: Vak, begrippen: string[]): string[] {
  const term = begrippen[0] ?? "een kernbegrip uit deze les";
  return [
    `Zoek zelfstandig één bericht, artikel of bron die past bij het vak ${vak.toLowerCase()} en waarin je ${term} herkent.`,
    `Schrijf 5-8 zinnen: wat is de bron, welk begrip zie je terug, en welk maatschappelijk vraagstuk raakt dit?`,
    `Neem je bron mee (link, foto of print) naar de volgende les — deze wordt gebruikt als opwarmer.`,
  ];
}

/* ------------------------------------------------------------------ */
/* Hoofdgenerator                                                       */
/* ------------------------------------------------------------------ */

function titelVoorLes(input: LessonInput): string {
  return `${input.vak} — ${input.niveau.toUpperCase()} ${input.leerjaar}: les over ${input.leerdoel
    .split(" ")
    .slice(0, 6)
    .join(" ")}...`;
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
        titel: "1. Leerdoel & kernbegrippen",
        duur: 8,
        inhoud: [
          idx === 0
            ? `Introduceer het leerdoel van deze lessenreeks: "${input.leerdoel}"`
            : `Herhaal kort het leerdoel uit de vorige les en introduceer de nieuwe kernbegrippen van vandaag.`,
          ...groep.map((b) => `${b[0].toUpperCase()}${b.slice(1)}: ${definieer(b, input.vak)}`),
        ],
      },
      {
        titel: "2. Casus met concrete cijfers",
        duur: 12,
        inhoud: bouwCasus(input.vak, groep, input.niveau),
      },
      {
        titel: "3. Uitgewerkt voorbeeld (klassikaal, docent modelt)",
        duur: 8,
        inhoud: bouwUitgewerktVoorbeeld(input.vak, groep),
      },
      {
        titel: "4. Opdracht in tweetallen",
        duur: 15,
        inhoud: bouwOpdracht(groep),
      },
      {
        titel: "5. Bespreken (plenair)",
        duur: 7,
        inhoud: bouwBespreken(),
      },
      {
        titel: isLaatsteLes ? "6. Huiswerk & vooruitblik toets" : "6. Huiswerk",
        duur: 0,
        inhoud: isLaatsteLes
          ? [
              ...bouwHuiswerk(input.vak, groep),
              "Vooruitblik: deze lessenreeks kan direct worden afgesloten met een toets die op dezelfde leerdoelen en kernbegrippen aansluit (zie toetsgenerator).",
            ]
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
