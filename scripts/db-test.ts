/**
 * Past alle migraties toe op een wegwerp-Postgres in Docker en draait daarna de
 * SQL-tests uit scripts/db-test/.
 *
 *   npx tsx scripts/db-test.ts
 *
 * Raakt de live database niet aan: alles gebeurt in een container die aan het
 * eind weer weg is. Er gaat geen enkele verbinding naar Supabase.
 *
 * Waarom dit bestaat: de policies en de quotumfunctie van het schoolmodel zijn
 * niet te beoordelen door ze te lezen. "Een docent van school B ziet de
 * bibliotheek van school A niet" is een bewering; een SELECT als die docent die
 * nul rijen teruggeeft is bewijs. Dit script levert dat bewijs.
 *
 * Bekende beperking: wat Supabase normaal levert (rollen, auth.uid(), storage)
 * en de basistabellen zonder migratiebestand zijn nagebouwd in
 * scripts/db-test/00-basis.sql. Wijkt de live database daarvan af, dan is deze
 * test daar blind voor. Een live-verificatie na de deploy vervangt dit dus niet.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const CONTAINER = "facula-db-test";
const IMAGE = "postgres:16-alpine";
const DB = "facula_test";
const WORTEL = path.join(__dirname, "..");

function docker(args: string[], invoer?: string) {
  return spawnSync("docker", args, {
    input: invoer,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function containerWeg() {
  docker(["rm", "-f", CONTAINER]);
}

function wachtOpPostgres(): void {
  for (let poging = 0; poging < 60; poging++) {
    const check = docker(["exec", CONTAINER, "pg_isready", "-U", "postgres", "-d", DB]);
    if (check.status === 0) return;
    // Bewust synchroon wachten: dit script doet één ding en hoeft niets
    // parallel te draaien.
    spawnSync("sleep", ["1"]);
  }
  throw new Error("Postgres kwam niet omhoog in de container.");
}

/**
 * Voert een SQL-bestand uit. ON_ERROR_STOP zorgt dat een migratie die
 * halverwege stukloopt het script laat falen in plaats van stil door te gaan
 * met een halve database.
 */
function draaiSql(bestand: string): void {
  const naam = path.basename(bestand);
  const sql = readFileSync(bestand, "utf8");
  const resultaat = docker(
    [
      "exec",
      "-i",
      CONTAINER,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-U",
      "postgres",
      "-d",
      DB,
    ],
    sql
  );

  const uitvoer = (resultaat.stdout ?? "").trim();
  if (resultaat.status !== 0) {
    console.log("  FOUT  " + naam);
    if (uitvoer) console.log(uitvoer);
    console.error((resultaat.stderr ?? "").trim());
    throw new Error("SQL mislukt: " + naam);
  }

  console.log("  ok    " + naam);
  // De tests schrijven hun eigen regels met RAISE NOTICE; die komen op stderr
  // binnen bij psql. Alleen tonen als er iets te melden is.
  const meldingen = (resultaat.stderr ?? "")
    .split("\n")
    .filter((regel) => regel.includes("NOTICE") || regel.includes("WARNING"))
    .map((regel) => regel.replace(/^psql:[^:]*:\d+: /, "").replace(/^NOTICE: +/, ""));
  for (const melding of meldingen) {
    if (melding.trim()) console.log("        " + melding.trim());
  }
  if (uitvoer) console.log(uitvoer);
}

function sqlBestanden(map: string, filter: (naam: string) => boolean): string[] {
  return readdirSync(map)
    .filter((naam) => naam.endsWith(".sql") && filter(naam))
    .sort()
    .map((naam) => path.join(map, naam));
}

function main() {
  const beschikbaar = docker(["info"]);
  if (beschikbaar.status !== 0) {
    console.error(
      "Docker is niet beschikbaar. Deze test heeft een lokale Docker nodig; er gaat niets naar de live database."
    );
    process.exit(1);
  }

  console.log("Wegwerp-Postgres starten");
  containerWeg();
  const start = docker([
    "run",
    "-d",
    "--name",
    CONTAINER,
    "-e",
    "POSTGRES_PASSWORD=facula-test",
    "-e",
    "POSTGRES_DB=" + DB,
    IMAGE,
  ]);
  if (start.status !== 0) {
    console.error(start.stderr);
    process.exit(1);
  }

  try {
    wachtOpPostgres();

    const testMap = path.join(WORTEL, "scripts", "db-test");

    console.log("");
    console.log("Basis (wat Supabase normaal levert) en testgereedschap");
    for (const bestand of sqlBestanden(testMap, (naam) => /^0/.test(naam))) {
      draaiSql(bestand);
    }

    console.log("");
    console.log("Migraties in volgorde");
    for (const bestand of sqlBestanden(path.join(WORTEL, "supabase", "migrations"), () => true)) {
      draaiSql(bestand);
    }

    console.log("");
    console.log("Tests");
    for (const bestand of sqlBestanden(testMap, (naam) => /^[12]/.test(naam))) {
      draaiSql(bestand);
    }

    console.log("");
    console.log("Alle controles geslaagd.");
  } finally {
    containerWeg();
  }
}

main();
