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
    // Scheidbare werkwoorden: aaneengeschreven vorm + voltooid deelwoord +
    // de gescheiden gebiedende-wijs-vorm ("noem ... op") apart, want die
    // laatste splitst het werkwoord over de zin (zie bouwPatroon).
    "opnoemen", "opgenoemd", "noem ... op",
    "som ... op",
    "wijs ... aan", "aangewezen",
    "geef ... weer",
  ],
  begrijpen: [
    "uitleggen", "samenvatten", "in eigen woorden weergeven", "illustreren",
    "verklaren", "toelichten", "vergelijken", "typeren", "ordenen",
    "classificeren", "voorbeelden geven", "parafraseren", "interpreteren",
    "schematiseren",
    // "leg ... uit" is de scheidbare gebiedende-wijs-vorm van "uitleggen" —
    // de meest voorkomende toetsvraag-formulering op dit niveau ("Leg uit
    // wat...") en zonder deze vorm wordt die niet herkend. Idem voor
    // "vat ... samen" (samenvatten).
    "leg ... uit", "licht ... toe", "vat ... samen",
  ],
  toepassen: [
    "toepassen", "uitvoeren", "gebruiken", "berekenen", "demonstreren",
    "oplossen", "plannen", "simuleren", "presenteren", "een procedure volgen",
    "selecteren", "schatten",
    // "los ... op" is de scheidbare gebiedende-wijs-vorm van "oplossen".
    "los ... op",
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

/** Klinkers die bij vervoeging kunnen verdubbelen als de lettergreep open
 * wordt (a/e/o/u), plus de trema-vormen ë/ï die dezelfde klank aangeven
 * maar geschreven los blijven van een voorgaande klinker (bv. "definiëren"
 * -> "definieer", niet "definiër"). */
const KORT_NAAR_LANG: Record<string, string> = {
  a: "aa", e: "ee", o: "oo", u: "uu", ë: "ee", ï: "ii",
};
const ALLE_KLINKERS = "aeiouyëïöü";

/**
 * Genereert de "lange" stam-variant volgens de NL-spellingsregel voor
 * werkwoordvervoeging: bij een infinitief die eindigt op klinker + één
 * medeklinker + "en", waarbij die klinker in een open lettergreep staat
 * (dus lang wordt uitgesproken), verdubbelt de klinker in de stam om die
 * lange klank vast te houden (analyseren -> analyseer, formuleren ->
 * formuleer, structureren -> structureer, herhalen -> herhaal). Bij een
 * klinker die al onderdeel is van een bestaand klinkerdigraph (oe/eu/ie/
 * ui/ou/au, te herkennen doordat de klinker ervoor zelf ook een klinker
 * is) gebeurt GEEN verdubbeling, want die klank is al lang geschreven
 * (benoemen -> benoem, niet benoeem; uitvoeren -> uitvoer). Trema-vormen
 * (ë/ï) zijn een uitzondering: die geven júist aan dat de klinker apart
 * staat (geen digraph), dus die verdubbelen wél (definiëren -> definieer).
 *
 * Deze regel is niet waterdicht voor elk NL-werkwoord: bij onbeklemtoonde
 * tussenlettergrepen (bv. "ordenen" -> "orden", "berekenen" -> "bereken",
 * "ontwikkelen" -> "ontwikkel") verdubbelt de klinker in werkelijkheid
 * NIET, terwijl deze regel dat op basis van spelling alleen niet kan
 * onderscheiden van een geval als "herhalen" -> "herhaal" (spellingsregel
 * hangt af van klemtoon, niet af te leiden uit de losse letters). Dat is
 * onschadelijk: bouwPatroon() gebruikt deze lange stam altijd als EXTRA
 * alternatief naast de bestaande korte stam, nooit als vervanging — een
 * fonetisch onjuiste lange stam levert dus hooguit een dode, nooit-
 * matchende extra regex-tak op, geen gemiste of foutieve match.
 */
function nlLangeStam(infinitief: string): string | null {
  if (!infinitief.endsWith("en") || infinitief.length <= 4) return null;
  const base = infinitief.slice(0, -2);
  if (base.length < 2) return null;

  const laatste = base[base.length - 1];
  const voorlaatste = base[base.length - 2];
  const vorVoorlaatste = base.length >= 3 ? base[base.length - 3] : "";

  const laatsteIsMedeklinker = !ALLE_KLINKERS.includes(laatste);
  const voorlaatsteIsVerdubbelbaar = voorlaatste in KORT_NAAR_LANG;
  const isTrema = voorlaatste === "ë" || voorlaatste === "ï";
  const vorVoorlaatsteIsKlinker = ALLE_KLINKERS.includes(vorVoorlaatste);

  if (
    laatsteIsMedeklinker &&
    voorlaatsteIsVerdubbelbaar &&
    (!vorVoorlaatsteIsKlinker || isTrema)
  ) {
    const langeKlinker = KORT_NAAR_LANG[voorlaatste];
    const langeStam = base.slice(0, -2) + langeKlinker + laatste;
    return langeStam === base ? null : langeStam;
  }
  return null;
}

/** Bouwt de stam-alternatieven (kort + evt. lang) voor één los werkwoord. */
function stamAlternatieven(werkwoord: string): string[] {
  if (!werkwoord.endsWith("en") || werkwoord.length <= 4) return [werkwoord];
  const kort = werkwoord.slice(0, -2);
  const lang = nlLangeStam(werkwoord);
  return lang && lang !== kort ? [kort, lang] : [kort];
}

/**
 * Bouwt een match-patroon voor één werkwoord/uitdrukking uit de lijst.
 * NL-werkwoorden conjugeren (uitleggen -> leg uit/legt uit/uitgelegd,
 * berekenen -> bereken/berekent/berekend, analyseren -> analyseer/
 * analyseert/analyseerde) — een simpele match op alleen de volledige
 * infinitief mist bijna elke conjugatie in vrije tekst. Daarom wordt bij
 * een los werkwoord dat op "en" eindigt gematcht op de STAM: zowel de
 * simpele infinitief-min-"en"-stam (dekt de infinitief zelf en de meeste
 * regelmatige vervoegingen) ALS, waar van toepassing, de "lange" stam met
 * verdubbelde klinker volgens de NL-spellingsregel voor open lettergrepen
 * (dekt gebiedende wijs en vervoegingen van werkwoorden als "analyseren"
 * -> "analyseer(t)"). Beide varianten staan als alternatie (a|b) in één
 * regex, op woordgrens — zie nlLangeStam() voor de precieze regel en de
 * bekende grens ervan. Scheidbare werkwoorden die als "deel1 ... deel2"
 * in de lijst staan (bv. "noem ... op" voor de gebiedende wijs van
 * "opnoemen") matchen deel1 (met zijn eigen stam-alternatieven) gevolgd
 * door deel2 verderop in dezelfde tekst. Overige meerwoord-uitdrukkingen
 * (bv. "in eigen woorden weergeven") worden als losse woordgroep gematcht,
 * niet gestemd.
 */
function bouwPatroon(werkwoord: string): RegExp {
  if (werkwoord.includes(" ... ")) {
    const [deel1, deel2] = werkwoord.split(" ... ");
    const stammen1 = stamAlternatieven(deel1).map(escapeRegex).join("|");
    return new RegExp(
      `\\b(?:${stammen1})\\w*\\b[\\s\\S]{0,40}?\\b${escapeRegex(deel2)}\\b`,
      "i"
    );
  }

  const isEenWoord = !werkwoord.includes(" ");
  if (!isEenWoord) {
    return new RegExp(`\\b${escapeRegex(werkwoord)}\\w*`, "i");
  }

  const stammen = stamAlternatieven(werkwoord).map(escapeRegex).join("|");
  return new RegExp(`\\b(?:${stammen})\\w*`, "i");
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
 * LLM-call, geen volwaardige lemmatisering, wel met een NL-spellingsregel
 * voor klinkerverdubbeling in de stam (zie bouwPatroon/nlLangeStam) zodat
 * ook gebiedende wijs en vervoegde vormen van werkwoorden als "analyseren"
 * worden herkend, niet alleen de kale infinitief.
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
