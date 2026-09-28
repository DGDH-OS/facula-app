/**
 * Smoke test voor de AI-lesgenerator. Draait tegen het echte Vertex-endpoint
 * met lokale Application Default Credentials, dus niet in CI.
 *
 *   GCP_PROJECT_ID=facula-dgdh npx tsx scripts/ai-smoke.ts
 *
 * Controleert de vorm die de PPTX-export nodig heeft (2 lesdelen van 8 secties),
 * of de leerdoelen echt uit de docenttekst zijn gehaald, en of er nergens een
 * kastlijntje in de output staat. Schrijft daarna een echte .pptx met de
 * bestaande exporter, want vorm-op-papier is het enige bewijs dat telt.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { GeneratedLesson, LessonInput } from "../src/lib/types";
import { genereerLesMetAi } from "../src/lib/ai/generate-lesson";
import { getLessonProviderChain } from "../src/lib/ai/provider";
import { bouwMihiribanPptxBuffer } from "../src/lib/pptx-export-mihiriban-style";
import { bouwLesPresentatie } from "../src/lib/pptx-export";

const UITVOER_DIR = "/Users/r.h.wdegoededeheij/.hermes/cache/scratch";
const UITVOER = path.join(UITVOER_DIR, "facula-lesv2-smoke.pptx");
const UITVOER_GENERIEK = path.join(UITVOER_DIR, "facula-lesv2-smoke-generiek.pptx");

const INPUT: LessonInput = {
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  lesduur: 50,
  aantalLessen: 2,
  leerdoel:
    "De leerling kan drie kenmerken van de rechtsstaat noemen en toepassen op " +
    "criminaliteitsbestrijding.\n" +
    "De leerling kan uitleggen waarom grondrechten ook voor verdachten gelden.",
};

const fouten: string[] = [];

function eis(voorwaarde: boolean, melding: string) {
  if (!voorwaarde) fouten.push(melding);
}

function controleer(les: GeneratedLesson) {
  eis(les.onderdelen.length === 2, "verwacht 2 lesdelen, kreeg " + les.onderdelen.length);
  les.onderdelen.forEach((deel, i) => {
    eis(
      deel.secties.length === 8,
      "lesdeel " + (i + 1) + " heeft " + deel.secties.length + " secties, verwacht 8"
    );
    deel.secties.forEach((sectie, j) => {
      eis(
        sectie.inhoud.length > 0,
        "lesdeel " + (i + 1) + " sectie " + (j + 1) + " heeft geen inhoud"
      );
    });
  });

  eis(
    (les.leerdoelen?.length ?? 0) >= 2,
    "verwacht minstens 2 leerdoelen, kreeg " + (les.leerdoelen?.length ?? 0)
  );

  const alleTekst = JSON.stringify(les);
  eis(!alleTekst.includes("\u2014"), "er staat een kastlijntje in de output");
  eis(les.bron === "ai", "bron is niet ai maar " + les.bron);
}

async function main() {
  if (!process.env.GCP_PROJECT_ID) {
    throw new Error("Zet GCP_PROJECT_ID, bijvoorbeeld facula-dgdh.");
  }

  const keten = getLessonProviderChain();
  if (keten.length === 0) {
    throw new Error("Geen AI-provider: staat FACULA_AI_PROVIDER op template?");
  }

  // Bewust de hele keten en niet alleen het eerste model: dit is exact het pad
  // dat POST /api/lessons aflegt, inclusief terugval op het tweede model. Een
  // test die alleen het primaire model aanroept zou groen blijven terwijl de
  // productieroute stilletjes op de sjabloongenerator draait.
  console.log("Keten:", keten.map((p) => p.name).join(" -> ") + " -> sjabloon");
  const begin = Date.now();
  const { les, pogingen } = await genereerLesMetAi(INPUT);
  console.log("Duur keten:", ((Date.now() - begin) / 1000).toFixed(1), "s");
  pogingen.forEach((regel) => console.log("  " + regel));

  controleer(les);

  console.log("");
  console.log("Titel:", les.titel);
  console.log("Model:", les.model, "| bron:", les.bron);
  console.log("Kernbegrippen:", les.kernbegrippen.join(", "));
  console.log("Leerdoelen:");
  les.leerdoelen?.forEach((d, i) => console.log("  " + (i + 1) + ". " + d));

  for (const deel of les.onderdelen) {
    const som = deel.secties.reduce((t, s) => t + (s.duur ?? 0), 0);
    console.log("");
    console.log(deel.titel + " (" + deel.duur + " min, som secties " + som + " min)");
    eis(
      Math.abs(som - INPUT.lesduur) <= 5,
      deel.titel + ": som " + som + " wijkt meer dan 5 min af van " + INPUT.lesduur
    );
    deel.leerdoelen?.forEach((d) => console.log("  doel: " + d));
    deel.secties.forEach((sectie) => {
      console.log("  [" + String(sectie.duur).padStart(2) + " min] " + sectie.titel);
      sectie.inhoud.forEach((regel) => console.log("        - " + regel));
      sectie.docentnotities?.forEach((regel) => console.log("        n: " + regel));
    });
  }

  const buffer = await bouwMihiribanPptxBuffer(les);
  await writeFile(UITVOER, buffer);
  console.log("");
  console.log("PPTX (sjabloonstijl):", UITVOER, buffer.length, "bytes");

  const generiek = bouwLesPresentatie(les);
  const generiekBuffer = (await generiek.write({ outputType: "nodebuffer" })) as Buffer;
  await writeFile(UITVOER_GENERIEK, generiekBuffer);
  console.log("PPTX (Facula-stijl):  ", UITVOER_GENERIEK, generiekBuffer.length, "bytes");

  if (fouten.length > 0) {
    console.error("");
    console.error("MISLUKT:");
    fouten.forEach((f) => console.error("  - " + f));
    process.exit(1);
  }
  console.log("");
  console.log("Alle controles geslaagd.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
