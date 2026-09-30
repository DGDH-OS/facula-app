import type { ToetsVraag, MeerkeuzeOptie } from "./types";

export const MAX_EIGEN_VRAGEN = 20000;

/**
 * Leest vragen uit een voorbeeldtoets van de docent. Elke vraag begint met
 * "(1p)" of "2p" of "1. (2p)". Meerkeuze-opties (A. B. C. D.) worden herkend.
 * De tekst blijft woordelijk zoals de docent hem aanleverde. Facula past niets
 * aan en verzint geen antwoordsleutel: die is "Nakijken door docent".
 */
export function parseVoorbeeldToets(tekst: string | undefined | null): ToetsVraag[] {
  if (!tekst || !tekst.trim()) return [];
  const regels = tekst.split(/\r?\n/);
  const blokken: string[] = [];
  const start = /^\s*(?:\d+[.)]\s*)?\(?(\d+)\s*p\)?\s+\S/i;
  for (const regel of regels) {
    if (start.test(regel) || blokken.length === 0) blokken.push(regel);
    else blokken[blokken.length - 1] += "\n" + regel;
  }
  const vragen: ToetsVraag[] = [];
  for (const blok of blokken) {
    const m = blok.match(/^\s*(?:\d+[.)]\s*)?\(?(\d+)\s*p\)?\s*/i);
    if (!m) continue;
    const punten = Number(m[1]);
    const rest = blok.slice(m[0].length).trim();
    if (!rest || punten < 1) continue;

    const optieRe = /(?:^|\s)([A-D])[.)]?\s+/g;
    const hits = [...rest.matchAll(optieRe)].filter((h) => h.index !== undefined);
    const heeftOpties =
      hits.length >= 4 && hits.slice(0, 4).map((h) => h[1]).join("") === "ABCD";
    if (heeftOpties) {
      const eerste = hits[0].index ?? 0;
      const vraag = rest.slice(0, eerste).trim();
      const opties: MeerkeuzeOptie[] = hits.slice(0, 4).map((h, i) => {
        const van = (h.index ?? 0) + h[0].length;
        const tot = i < 3 ? (hits[i + 1].index ?? rest.length) : rest.length;
        return { label: h[1], tekst: rest.slice(van, tot).trim(), correct: false };
      });
      vragen.push({
        nummer: 0,
        type: "meerkeuze",
        vraag,
        punten,
        opties,
        antwoordsleutel: "Juiste antwoord invullen door docent.",
      });
    } else {
      vragen.push({
        nummer: 0,
        type: "open",
        vraag: rest,
        punten,
        antwoordsleutel: "Nakijken door docent.",
      });
    }
  }
  return vragen;
}
