/**
 * Generieke content-dichtheid regels voor slide-body's, gebaseerd op
 * PRESENTATIE-METHODIEK.md (Assertion-Evidence/Alley Penn State,
 * Mayer's redundancy principle, Cowan 2010 werkgeheugen-chunks).
 *
 * Kernregel: content die de docent uitlegt hoort als kernwoord/label op de
 * slide, nooit als volzin. Alleen een definitie die leerlingen moeten lezen
 * mag een korte, losse zin zijn — nooit een lijst van meerdere volzinnen.
 *
 * Beide exportroutes (pptx-export.ts en pptx-export-mihiriban-style.ts, via
 * de content die lesson-generator.ts oplevert) moeten door dezelfde regels
 * heen, zodat "kort genoeg" niet per bouwfunctie los geïnterpreteerd wordt.
 */

export const MAX_TITLE_WORDS = 14;
export const MAX_BULLETS_PER_SLIDE = 4;
export const MAX_WORDS_PER_BULLET = 7;
export const MAX_BODY_WORDS_TOTAL = 30;
export const MAX_DEFINITIE_WOORDEN = 12;

function woorden(tekst: string): string[] {
  return tekst.trim().split(/\s+/).filter(Boolean);
}

export function telWoorden(tekst: string): number {
  return woorden(tekst).length;
}

/** Knipt één regel af tot maximaal MAX_WORDS_PER_BULLET woorden. */
export function trimBullet(regel: string, maxWoorden: number = MAX_WORDS_PER_BULLET): string {
  const schoon = regel.trim().replace(/\s+/g, " ");
  const w = woorden(schoon);
  if (w.length <= maxWoorden) return schoon;
  return w.slice(0, maxWoorden).join(" ");
}

/** Knipt een titel af tot maximaal MAX_TITLE_WORDS woorden (assertion-zin). */
export function trimTitel(titel: string, maxWoorden: number = MAX_TITLE_WORDS): string {
  const schoon = titel.trim().replace(/\s+/g, " ");
  const w = woorden(schoon);
  if (w.length <= maxWoorden) return schoon;
  return w.slice(0, maxWoorden).join(" ");
}

/**
 * Dwingt een lijst slide-regels af tot de harde limieten:
 * - max MAX_BULLETS_PER_SLIDE regels
 * - max MAX_WORDS_PER_BULLET woorden per regel
 * - max MAX_BODY_WORDS_TOTAL woorden opgeteld over de hele body
 *
 * Regels die de body-limiet zouden overschrijden worden afgekapt of
 * weggelaten in plaats van de body langer te maken dan toegestaan.
 */
export function afdwingenSlideRegels(
  regels: string[],
  opties: {
    maxBullets?: number;
    maxWoordenPerBullet?: number;
    maxTotaalWoorden?: number;
  } = {}
): string[] {
  const maxBullets = opties.maxBullets ?? MAX_BULLETS_PER_SLIDE;
  const maxWoordenPerBullet = opties.maxWoordenPerBullet ?? MAX_WORDS_PER_BULLET;
  const maxTotaalWoorden = opties.maxTotaalWoorden ?? MAX_BODY_WORDS_TOTAL;

  const getrimd = regels
    .map((r) => trimBullet(r, maxWoordenPerBullet))
    .filter(Boolean)
    .slice(0, maxBullets);

  const resultaat: string[] = [];
  let totaal = 0;
  for (const regel of getrimd) {
    const n = telWoorden(regel);
    if (totaal + n > maxTotaalWoorden) {
      const resterend = maxTotaalWoorden - totaal;
      if (resterend > 0) {
        const afgekapt = woorden(regel).slice(0, resterend).join(" ");
        if (afgekapt) resultaat.push(afgekapt);
      }
      break;
    }
    resultaat.push(regel);
    totaal += n;
  }
  return resultaat;
}

/**
 * Definitie-regel: een definitie is 1 losse, korte kernzin — nooit een lijst
 * van volzinnen. Knipt af tot MAX_DEFINITIE_WOORDEN en zorgt voor nette
 * afsluiting zonder los leesteken.
 */
export function afdwingenDefinitie(definitie: string, maxWoorden: number = MAX_DEFINITIE_WOORDEN): string {
  const schoon = definitie.trim().replace(/\s+/g, " ").replace(/[.,;:]+$/, "");
  const w = woorden(schoon);
  if (w.length <= maxWoorden) return schoon;
  return w.slice(0, maxWoorden).join(" ");
}
