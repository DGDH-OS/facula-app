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

/**
 * Alleen kale records: prototype is Object.prototype of null.
 * Custom classes en Object.create({ ... }) vallen af, zodat
 * geërfde PII-sleutels niet buiten Object.keys om binnenkomen.
 */
export function isPlainRecord(
  waarde: unknown,
): waarde is Record<string, unknown> {
  if (typeof waarde !== "object" || waarde === null) {
    return false;
  }
  try {
    if (Array.isArray(waarde)) return false;
    const proto = Object.getPrototypeOf(waarde);
    return proto === Object.prototype || proto === null;
  } catch {
    return false;
  }
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
  let ids: unknown[] | null = null;
  try {
    if (Array.isArray(toegestaan)) ids = toegestaan;
  } catch {
    ids = null;
  }
  if (!isPlainRecord(velden) || !ids) {
    return ongeldigVeld();
  }
  if (!ids.every((id) => typeof id === "string")) {
    return ongeldigVeld();
  }
  const mag = new Set(ids);
  for (const id of Object.keys(velden)) {
    const sleutel = id.toLowerCase();
    if (VERBODEN.has(sleutel) || !mag.has(id)) {
      return ongeldigVeld();
    }
  }
  return null;
}
