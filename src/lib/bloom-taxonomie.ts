/**
 * Bloom-taxonomie (herzien, Anderson & Krathwohl 2001) — Nederlandse
 * werkwoordenlijst per cognitief niveau + rule-based niveau-detectie.
 *
 * Bron: RESEARCH-DIDACTIEK-LEERDOELEN.md sectie 2 (SLO, LOI-werkwoordenlijst,
 * UU Teaching & Learning Collection, Krathwohl 2002).
 *
 * Detectie is opzettelijk simpel en regel-gebaseerd (geen LLM-call): match
 * het hoofdwerkwoord/kenmerkende werkwoordsvorm van de zin tegen de tabel.
 * Bij een match op meerdere niveaus wint het HOOGSTE niveau (zie
 * RESEARCH-DIDACTIEK-LEERDOELEN.md: "bij dubbele match kies het hoogste
 * niveau"). Geen enkele match → "onbekend" (expliciete fallback, geen gok).
 */

export type BloomNiveau =
  | "onthouden"
  | "begrijpen"
  | "toepassen"
  | "analyseren"
  | "evalueren"
  | "creëren"
  | "onbekend";

export type BekendBloomNiveau = Exclude<BloomNiveau, "onbekend">;

/** Volgorde laag → hoog, gebruikt om verschil tussen twee niveaus te bepalen. */
export const BLOOM_NIVEAU_RANG: Record<BekendBloomNiveau, number> = {
  onthouden: 1,
  begrijpen: 2,
  toepassen: 3,
  analyseren: 4,
  evalueren: 5,
  creëren: 6,
};

/** Nette labels voor weergave, o.a. het niet-ascii "creëren". */
export const BLOOM_NIVEAU_VOLGORDE: BekendBloomNiveau[] = [
  "onthouden",
  "begrijpen",
  "toepassen",
  "analyseren",
  "evalueren",
  "creëren",
];

/**
 * NL werkwoordenlijst per niveau, 12-15 werkwoorden/uitdrukkingen per niveau,
 * uit RESEARCH-DIDACTIEK-LEERDOELEN.md tabel sectie 2 (Bloom herzien).
 */
export const BLOOM_WERKWOORDEN: Record<BekendBloomNiveau, string[]> = {
  onthouden: [
    "noemen", "benoemen", "opsommen", "beschrijven", "herhalen", "herkennen",
    "reproduceren", "definiëren", "opzoeken", "weergeven", "aanwijzen",
    "citeren", "navertellen", "in volgorde plaatsen",
  ],
  begrijpen: [
    "uitleggen", "samenvatten", "in eigen woorden weergeven", "illustreren",
    "verklaren", "toelichten", "vergelijken", "typeren", "ordenen",
    "classificeren", "voorbeelden geven", "parafraseren", "interpreteren",
    "schematiseren",
  ],
  toepassen: [
    "toepassen", "uitvoeren", "gebruiken", "berekenen", "demonstreren",
    "oplossen", "plannen", "simuleren", "presenteren", "een procedure volgen",
    "selecteren", "schatten",
  ],
  analyseren: [
    "analyseren", "onderscheiden", "categoriseren", "verbanden leggen",
    "oorzaak-gevolg aangeven", "kritisch vergelijken", "onderzoeken",
    "ontleden", "structureren", "patronen aangeven", "prioriteren",
    "fouten opsporen",
  ],
  evalueren: [
    "beoordelen", "evalueren", "beargumenteren", "concluderen",
    "een oordeel geven", "verdedigen", "bekritiseren", "afwegen",
    "rechtvaardigen", "toetsen aan criteria", "aanbevelen", "reflecteren",
  ],
  creëren: [
    "ontwerpen", "ontwikkelen", "opstellen", "construeren", "samenstellen",
    "produceren", "formuleren", "bedenken", "combineren", "componeren",
    "een plan maken", "een model bouwen",
  ],
};

/**
 * Vage werkwoorden die zelf niet toetsbaar/classificeerbaar zijn (uit
 * RESEARCH-DIDACTIEK-LEERDOELEN.md sectie 1). Puur informatief hier — de
 * detectiefunctie valt terug op "onbekend" als geen enkel concreet
 * werkwoord matcht, ook als zo'n vaag werkwoord wél voorkomt.
 */
export const VAGE_WERKWOORDEN: string[] = [
  "begrijpen", "beheersen", "weten", "kennen", "inzicht hebben in",
  "bekend zijn met", "waarderen", "omgaan met",
];

function normaliseer(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

/** Escaped een werkwoord/uitdrukking voor gebruik in een regex-patroon. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Bouwt een match-patroon voor één werkwoord/uitdrukking uit de lijst.
 * NL-werkwoorden conjugeren (uitleggen -> leg uit/legt uit/uitgelegd,
 * berekenen -> bereken/berekent/berekend) — een simpele match op alleen de
 * volledige infinitief mist bijna elke conjugatie in vrije tekst. Daarom
 * wordt bij een los werkwoord dat op "en" eindigt de STAM gebruikt (het
 * werkwoord zonder de laatste twee letters), gematcht op woordgrens: dat
 * dekt de gebruikelijke NL-vervoegingen zonder een volwaardige
 * lemmatiseerder nodig te hebben. Meerwoord-uitdrukkingen (bv. "in eigen
 * woorden weergeven") worden als losse woordgroep gematcht, niet gestemd.
 */
function bouwPatroon(werkwoord: string): RegExp {
  const isEenWoord = !werkwoord.includes(" ");
  const stam =
    isEenWoord && werkwoord.endsWith("en") && werkwoord.length > 4
      ? werkwoord.slice(0, -2)
      : werkwoord;
  return new RegExp(`\\b${escapeRegex(stam)}\\w*`, "i");
}

const BLOOM_PATRONEN: Record<BekendBloomNiveau, RegExp[]> = Object.fromEntries(
  BLOOM_NIVEAU_VOLGORDE.map((niveau) => [
    niveau,
    BLOOM_WERKWOORDEN[niveau].map(bouwPatroon),
  ])
) as Record<BekendBloomNiveau, RegExp[]>;

/**
 * Detecteert het Bloom-niveau van een tekst (leerdoel of toetsvraag) op
 * basis van werkwoord-matching. Simpele, snelle keyword-match — geen
 * LLM-call, geen volwaardige lemmatisering, bewust conservatief (zie
 * bouwPatroon voor de stam-aanpak die gangbare vervoegingen dekt).
 *
 * Bij matches op meerdere niveaus: retourneert het HOOGSTE niveau (een zin
 * die zowel "benoem" als "analyseer" bevat vraagt per saldo het hoogste
 * denkniveau van de leerling). Geen enkele match → "onbekend".
 */
export function detecteerBloomNiveau(tekst: string): BloomNiveau {
  const genormaliseerd = normaliseer(tekst);
  if (!genormaliseerd) return "onbekend";

  const gematchteNiveaus: BekendBloomNiveau[] = [];

  for (const niveau of BLOOM_NIVEAU_VOLGORDE) {
    const gevonden = BLOOM_PATRONEN[niveau].some((patroon) => patroon.test(genormaliseerd));
    if (gevonden) gematchteNiveaus.push(niveau);
  }

  if (gematchteNiveaus.length === 0) return "onbekend";

  return gematchteNiveaus.reduce((hoogste, huidig) =>
    BLOOM_NIVEAU_RANG[huidig] > BLOOM_NIVEAU_RANG[hoogste] ? huidig : hoogste
  );
}
