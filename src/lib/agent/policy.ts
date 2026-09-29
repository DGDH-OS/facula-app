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

function ongeldigVeld(): AssistentWeigering {
  return {
    soort: "geweigerd",
    code: "ongeldig-veld",
    melding:
      "Je kunt hier geen namen, e-mailadressen of leerlingteksten " +
      "invullen. Kies alleen de vaste opties.",
  };
}

function isPlainRecord(waarde: unknown): waarde is Record<string, unknown> {
  return (
    typeof waarde === "object" &&
    waarde !== null &&
    !Array.isArray(waarde)
  );
}

/**
 * Weigert velden die niet in het register horen. Geen vrije-tekstscan:
 * namen horen hier niet als invoer, dus ook niet als filter achteraf.
 * Publieke grens: ongeldige runtime-waarden geven weigering, geen throw.
 */
export function weigerIndienNodig(
  velden: unknown,
  toegestaan: unknown,
): AssistentWeigering | null {
  if (!isPlainRecord(velden) || !Array.isArray(toegestaan)) {
    return ongeldigVeld();
  }
  if (!toegestaan.every((id) => typeof id === "string")) {
    return ongeldigVeld();
  }
  const mag = new Set(toegestaan);
  for (const id of Object.keys(velden)) {
    const sleutel = id.toLowerCase();
    if (VERBODEN.has(sleutel) || !mag.has(id)) {
      return ongeldigVeld();
    }
  }
  return null;
}
