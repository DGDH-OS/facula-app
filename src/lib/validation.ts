/**
 * Server-side inputvalidatie voor de generator-API-routes. Geen nieuwe
 * dependency — kleine helpers die een te grote/foutieve request al vóór
 * JSON.parse of business-logica afwijzen.
 */

export const MAX_BODY_BYTES = 20_000;

/**
 * Leest de request-body als tekst en weigert alles boven MAX_BODY_BYTES.
 * Moet vóór JSON.parse gebeuren — een te grote body mag nooit eerst
 * geparsed worden.
 */
export async function readBodyWithLimit(
  request: Request
): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { ok: false, status: 413 };
  }
  return { ok: true, text };
}

/** Geeft `value` terug als geheel getal binnen [min, max], anders `null`. */
export function clampInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

/** Geeft de getrimde string terug, of `null` als hij geen string is of te lang. */
export function limitString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return null;
  return trimmed;
}
