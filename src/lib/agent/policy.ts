import type { AssistentWeigering } from "./types";

const VERBODEN = new Set([
  "naam",
  "email",
  "e-mail",
  "leerling",
  "ouder",
  "observatie",
  "feedback",
  "student",
  "parent",
]);

/**
 * Weigert velden die niet in het register horen. Geen vrije-tekstscan:
 * namen horen hier niet als invoer, dus ook niet als filter achteraf.
 */
export function weigerIndienNodig(
  velden: Record<string, unknown>,
  toegestaan: readonly string[],
): AssistentWeigering | null {
  const mag = new Set(toegestaan);
  for (const id of Object.keys(velden)) {
    const sleutel = id.toLowerCase();
    if (VERBODEN.has(sleutel) || !mag.has(id)) {
      return {
        soort: "geweigerd",
        code: "ongeldig-veld",
        melding:
          "Je kunt hier geen namen, e-mailadressen of leerlingteksten " +
          "invullen. Kies alleen de vaste opties.",
      };
    }
  }
  return null;
}
