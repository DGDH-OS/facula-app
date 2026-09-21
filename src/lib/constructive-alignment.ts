import {
  detecteerBloomNiveau,
  BLOOM_NIVEAU_RANG,
  type BloomNiveau,
} from "./bloom-taxonomie";

/**
 * Constructive-alignment-guardrail (Biggs) — zelfde patroon als de
 * bestaande AVG-guardrail in avg-guardrails.ts: een regel-gebaseerde
 * functie die output controleert en een resultaat-object teruggeeft, geen
 * AI-classifier.
 *
 * Principe: leerdoel en toetsvraag moeten op (ongeveer) hetzelfde
 * cognitieve Bloom-niveau zitten. Bij undershoot (toets makkelijker dan het
 * leerdoel) leren leerlingen oppervlakkig ("backwash-effect") — dit is het
 * gevaarlijkste geval. Bron: RESEARCH-DIDACTIEK-LEERDOELEN.md sectie 4.
 */

export const AFSTEMMING_TOLERANTIE = 1;

export interface AfstemmingResultaat {
  afgestemd: boolean;
  leerdoelNiveau: BloomNiveau;
  toetsvraagNiveau: BloomNiveau;
  waarschuwing?: string;
}

/**
 * Vergelijkt het Bloom-niveau van een leerdoel met dat van een toetsvraag.
 * Kan geen van beide een niveau bepalen (onbekend werkwoord) dan wordt dit
 * NOOIT als mismatch gemeld — een onbekend niveau is geen bewezen mismatch,
 * dus `afgestemd: true` zonder waarschuwing ("handmatige check nodig" is
 * hier bewust geen harde blokkade, in lijn met het onderzoeksadvies).
 */
export function controleerAfstemming(
  leerdoel: string,
  toetsvraag: string,
  tolerantie: number = AFSTEMMING_TOLERANTIE
): AfstemmingResultaat {
  const leerdoelNiveau = detecteerBloomNiveau(leerdoel);
  const toetsvraagNiveau = detecteerBloomNiveau(toetsvraag);

  if (leerdoelNiveau === "onbekend" || toetsvraagNiveau === "onbekend") {
    return { afgestemd: true, leerdoelNiveau, toetsvraagNiveau };
  }

  const rangLeerdoel = BLOOM_NIVEAU_RANG[leerdoelNiveau];
  const rangToets = BLOOM_NIVEAU_RANG[toetsvraagNiveau];
  const verschil = rangToets - rangLeerdoel;
  const afgestemd = Math.abs(verschil) <= tolerantie;

  if (afgestemd) {
    return { afgestemd, leerdoelNiveau, toetsvraagNiveau };
  }

  const waarschuwing =
    verschil > tolerantie
      ? `Toetsvraag (${toetsvraagNiveau}) ligt hoger dan het leerdoel (${leerdoelNiveau}) — mogelijk te moeilijk (overshoot).`
      : `Toetsvraag (${toetsvraagNiveau}) ligt lager dan het leerdoel (${leerdoelNiveau}) — te makkelijk, backwash-risico (undershoot).`;

  return { afgestemd, leerdoelNiveau, toetsvraagNiveau, waarschuwing };
}
