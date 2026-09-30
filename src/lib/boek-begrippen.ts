/**
 * Begrippen en definities uit het lesboek van de docent.
 *
 * Facula verzint zelf geen definities. Alles wat als vakinhoud geldt komt
 * woordelijk uit deze invoer. Formaat: één begrip per regel,
 * "begrip: definitie uit het boek". Een regel zonder ":" is een begrip
 * zonder definitie.
 */
export interface BoekBegrip {
  begrip: string;
  /** Woordelijk uit het lesboek. Leeg = de docent gaf geen definitie. */
  definitie: string;
}

export const MAX_BOEK_BEGRIPPEN = 6000;

export function parseBoekBegrippen(tekst: string | undefined | null): BoekBegrip[] {
  if (!tekst) return [];
  const gezien = new Set<string>();
  const lijst: BoekBegrip[] = [];
  for (const regel of tekst.split(/\r?\n/)) {
    const schoon = regel.trim().replace(/^[-*•\d.)\s]+(?=\S)/, "");
    if (!schoon) continue;
    const i = schoon.indexOf(":");
    const begrip = (i === -1 ? schoon : schoon.slice(0, i)).trim();
    const definitie = i === -1 ? "" : schoon.slice(i + 1).trim();
    const sleutel = begrip.toLowerCase();
    if (!begrip || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    lijst.push({ begrip, definitie });
  }
  return lijst;
}

export function zoekDefinitie(boek: BoekBegrip[], begrip: string): string {
  const sleutel = begrip.toLowerCase().trim();
  return boek.find((b) => b.begrip.toLowerCase() === sleutel)?.definitie ?? "";
}
