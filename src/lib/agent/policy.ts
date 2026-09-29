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

const MAX_LIJST = 1000;

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

/** Eigen string-sleutels, of null als ownKeys/descriptor-traps gooien. */
export function eigenSleutels(waarde: object): string[] | null {
  try {
    return Object.keys(waarde);
  } catch {
    return null;
  }
}

/** Eigen waarde, of null als has/get/descriptor-traps gooien. */
export function leesEigen(
  waarde: object,
  id: string,
): { ok: true; waarde: unknown } | { ok: false } {
  try {
    if (!(id in waarde)) {
      return { ok: true, waarde: undefined };
    }
    if (!Object.prototype.hasOwnProperty.call(waarde, id)) {
      return { ok: true, waarde: undefined };
    }
    return { ok: true, waarde: (waarde as Record<string, unknown>)[id] };
  } catch {
    return { ok: false };
  }
}

/**
 * Kopieert een array naar een dichte lijst. Gooiende length/index-traps
 * geven null, zodat latere every/spread niet meer de proxy raken.
 */
export function dichteLijst(waarde: unknown): unknown[] | null {
  try {
    if (!Array.isArray(waarde)) return null;
    const lengte = waarde.length;
    if (!Number.isInteger(lengte) || lengte < 0 || lengte > MAX_LIJST) {
      return null;
    }
    const uit: unknown[] = [];
    for (let i = 0; i < lengte; i += 1) {
      if (!(i in waarde)) return null;
      if (!Object.prototype.hasOwnProperty.call(waarde, i)) return null;
      uit.push(waarde[i]);
    }
    return uit;
  } catch {
    return null;
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
  const ids = dichteLijst(toegestaan);
  if (!isPlainRecord(velden) || !ids) {
    return ongeldigVeld();
  }
  if (!ids.every((id) => typeof id === "string")) {
    return ongeldigVeld();
  }
  const mag = new Set(ids as string[]);
  const sleutels = eigenSleutels(velden);
  if (!sleutels) return ongeldigVeld();
  for (const id of sleutels) {
    const sleutel = id.toLowerCase();
    if (VERBODEN.has(sleutel) || !mag.has(id)) {
      return ongeldigVeld();
    }
    const gelezen = leesEigen(velden, id);
    if (!gelezen.ok) return ongeldigVeld();
  }
  return null;
}
