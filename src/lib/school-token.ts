import { createHash, randomBytes } from "node:crypto";

/**
 * Het uitnodigingstoken: maken, hashen en herkennen.
 *
 * Server-only (node:crypto). Twee regels waar de rest op leunt:
 *
 *   1. het token komt uit randomBytes, niet uit Math.random. Een raadbaar
 *      token is een uitnodiging voor iedereen;
 *   2. in de database staat alleen de SHA-256. Wie de database leest, kan
 *      daarmee geen uitnodiging accepteren. Er is geen weg terug van hash naar
 *      token, dus het token bestaat precies één keer: in de link die de
 *      beheerder aan zijn collega geeft.
 *
 * Geen zout en geen langzame hash (bcrypt/argon2), en dat is hier de juiste
 * keuze: dit is geen wachtwoord dat een mens onthoudt, maar 32 willekeurige
 * bytes. Er is niets om te raden en dus niets te vertragen. Wat een zout zou
 * toevoegen, is dat opzoeken op hash niet meer kan, en dat is precies wat
 * accepteren doet.
 */

const TOKEN_BYTES = 32;

/** Een nieuw token: 32 willekeurige bytes als url-veilige tekst. */
export function nieuwInviteToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** De SHA-256 van een token, als 64 hexcijfers (de vorm in de database). */
export function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Of dit eruitziet als een token dat wij gemaakt hebben.
 *
 * Bewust een vormcheck vóór de databaseaanroep: een verzoek met een megabyte
 * aan onzin in de URL hoort niet eerst gehasht en opgezocht te worden. Een
 * base64url-tekst van 32 bytes is 43 tekens; wat daar niet op lijkt, kan
 * onmogelijk van ons komen.
 */
export function lijktOpToken(waarde: unknown): waarde is string {
  return typeof waarde === "string" && /^[A-Za-z0-9_-]{20,100}$/.test(waarde);
}
