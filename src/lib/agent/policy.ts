import { controleerCoachPii } from "../coach/matcher";
import type { AssistentWeigering } from "./types";

const BEOORDELING =
  /\b(cijfer(?:s|en)?|beoordel(?:en|ing)?|punten geven|score geven|voldoende geven|onvoldoende geven|automatisch nakijken|nakijken en scoren)\b/i;

const OVERGANG =
  /\b(zakken|zakt|overgaan|overgaat|blijven zitten|zittenblijv(?:en|er)?|doubler(?:en|ing)?|promotie|overgangsnorm|blijft zitten)\b/i;

const LEERLINGGERICHT =
  /\b(voor (?:de |mijn )?leerlingen om zelf|leerlingversie|leerlingportaal|oefenapp voor leerlingen|leerlingen laten inloggen|zelfstandig door leerlingen)\b/i;

/**
 * Weigert verzoeken die buiten het product vallen of AVG/AI Act-grenzen
 * raken. Geen stille fallback: elke weigering heeft een uitleg.
 */
export function weigerIndienNodig(vraag: string): AssistentWeigering | null {
  const tekst = vraag.trim();
  if (!tekst) return null;

  const pii = controleerCoachPii(tekst);
  if (pii.bevatPii) {
    return {
      soort: "geweigerd",
      code: "pii",
      melding:
        "Dit verzoek bevat persoonsgegevens (bijvoorbeeld een naam, e-mail, telefoonnummer of medische term). Haal die weg. In Facula gebruik je bij leerlingteksten alleen initialen, en dat doe je in de rapport- of oudercontact-module — niet hier.",
    };
  }

  if (OVERGANG.test(tekst)) {
    return {
      soort: "geweigerd",
      code: "overgang",
      melding:
        "Facula geeft geen advies over overgaan, zakken of blijven zitten. Dat oordeel blijft bij jou en de school. Kies een bestaande module als je een les, toets of rapporttekst wilt voorbereiden.",
    };
  }

  if (BEOORDELING.test(tekst)) {
    return {
      soort: "geweigerd",
      code: "beoordeling",
      melding:
        "De Assistent geeft geen cijfers en beoordeelt geen leerlingwerk. Nakijken plant de stapel; het oordeel vul jij zelf in.",
    };
  }

  if (LEERLINGGERICHT.test(tekst)) {
    return {
      soort: "geweigerd",
      code: "leerlinggericht",
      melding:
        "Facula is voor de docent, niet voor leerlingen. Leerlingen loggen nergens in. Maak materiaal in de les- of toetsmodule en exporteer het zelf.",
    };
  }

  return null;
}
