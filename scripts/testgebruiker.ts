/**
 * Maakt of verwijdert een tijdelijke, al bevestigde testgebruiker.
 *
 *   npx tsx scripts/testgebruiker.ts maak
 *   npx tsx scripts/testgebruiker.ts weg
 *
 * Bewust via de Admin API met email_confirm en NOOIT via het publieke
 * signup-formulier: dat verstuurt een bevestigingsmail via de ingebouwde SMTP
 * en drijft de bounce-rate van de gedeelde Supabase omhoog (zie de
 * projectnotities). Er vuurt hier dus geen enkele mail.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const EMAIL = "facula-uitest@dgdh-os.com";
const WACHTWOORD = "Huisstijl-Test-" + "2026!";

function env(): { url: string; serviceKey: string } {
  // .env.local wordt door tsx niet automatisch geladen; hier alleen lezen,
  // nooit schrijven, en de waarden komen niet in de uitvoer terecht.
  const regels = readFileSync(".env.local", "utf8").split("\n");
  const waarden: Record<string, string> = {};
  for (const regel of regels) {
    const index = regel.indexOf("=");
    if (index > 0) waarden[regel.slice(0, index).trim()] = regel.slice(index + 1).trim();
  }
  const url = waarden.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = waarden.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt.");
  return { url, serviceKey };
}

async function main() {
  const actie = process.argv[2];
  const { url, serviceKey } = env();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: lijst, error: lijstFout } = await admin.auth.admin.listUsers();
  if (lijstFout) throw lijstFout;
  const bestaand = lijst.users.find((u) => u.email === EMAIL);

  if (actie === "weg") {
    if (!bestaand) {
      console.log("Geen testgebruiker gevonden, niets te doen.");
      return;
    }
    const { error } = await admin.auth.admin.deleteUser(bestaand.id);
    if (error) throw error;
    console.log("Testgebruiker verwijderd:", EMAIL);
    return;
  }

  if (actie !== "maak") {
    throw new Error("Gebruik: npx tsx scripts/testgebruiker.ts maak | weg");
  }

  if (bestaand) {
    console.log("Testgebruiker bestond al:", EMAIL, bestaand.id);
    console.log("WACHTWOORD=" + WACHTWOORD);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: WACHTWOORD,
    email_confirm: true,
  });
  if (error) throw error;
  console.log("Testgebruiker gemaakt:", EMAIL, data.user?.id);
  console.log("WACHTWOORD=" + WACHTWOORD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
