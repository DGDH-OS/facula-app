/**
 * Smoke test voor de AI-vermelding in de exports (AI-verordening art. 50).
 *
 *   npx tsx scripts/ai-melding-smoke.ts
 *
 * Draait volledig lokaal, zonder netwerk en zonder database. Controleert dat
 * elk bestand dat een docent kan downloaden de vermelding echt draagt, en niet
 * alleen dat de code hem ergens toevoegt:
 *
 *   1. de eigen-huisstijl-PowerPoint: de vermelding in de notities van elke
 *      dia en zichtbaar op de titeldia;
 *   2. de sjabloon-PowerPoint (pptx-automizer): zichtbaar op de titeldia van
 *      elk lesblok, en het sjabloon zelf nog intact (afbeeldingen aanwezig);
 *   3. de toets in Word: in de voettekst van beide secties, dus ook onder het
 *      losse antwoordenblad;
 *   4. de rapporttekst in Word: in de voettekst.
 *
 * De controle leest de XML uit het zipbestand, want dat is wat PowerPoint en
 * Word ook lezen. Een test die alleen de bouwfunctie aanroept zou een
 * vermelding die per ongeluk buiten het bestand valt niet zien.
 */
import JSZip from "jszip";
import { Packer } from "docx";
import { AI_MELDING_EXPORT } from "../src/lib/ai-transparantie";
import { genereerLes } from "../src/lib/lesson-generator";
import { genereerToets } from "../src/lib/test-generator";
import { genereerRapportTekst } from "../src/lib/report-generator";
import { bouwLesPresentatie } from "../src/lib/pptx-export";
import { bouwMihiribanPptxBuffer } from "../src/lib/pptx-export-mihiriban-style";
import { bouwToetsDocument } from "../src/lib/docx-export";
import { bouwRapportDocument } from "../src/lib/report-docx-export";
import type { LessonInput, ReportInput, TestInput } from "../src/lib/types";

const LEERDOEL =
  "Je kunt uitleggen wat de begrippen referentiekader, selectieve waarneming en framing betekenen, en hoe ze samenhangen met maatschappelijke problemen.";

const LES_INPUT: LessonInput = {
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  leerdoel: LEERDOEL,
  lesduur: 50,
  aantalLessen: 2,
};

const TOETS_INPUT: TestInput = {
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  leerdoel: LEERDOEL,
  kernbegrippen: "framing, polarisatie, desinformatie",
  aantalVragen: 10,
};

const RAPPORT_INPUT: ReportInput = {
  leerlingLabel: "Sanne",
  aantekeningen: "doet goed mee, moeite met plannen, sterke mondelinge bijdrage",
  outputType: "rapporttekst",
  toon: "vriendelijk-direct",
};

let fouten = 0;

function controle(wat: string, geslaagd: boolean, detail = "") {
  const teken = geslaagd ? "ok  " : "FOUT";
  console.log("  " + teken + " " + wat + (detail ? "  (" + detail + ")" : ""));
  if (!geslaagd) fouten++;
}

/** Alle bestanden in de zip waarvan het pad met een van de prefixen begint. */
async function xmlDelen(bytes: Uint8Array, prefixen: string[]): Promise<string[]> {
  const zip = await JSZip.loadAsync(bytes);
  const namen = Object.keys(zip.files).filter((naam) =>
    prefixen.some((prefix) => naam.startsWith(prefix))
  );
  return Promise.all(namen.map((naam) => zip.files[naam].async("string")));
}

async function main() {
  const les = genereerLes(LES_INPUT);
  const toets = genereerToets(TOETS_INPUT);
  const rapport = genereerRapportTekst(RAPPORT_INPUT);

  console.log("PowerPoint in eigen huisstijl");
  const pptxBytes = (await bouwLesPresentatie(les).write({
    outputType: "nodebuffer",
  })) as Uint8Array;
  const notities = await xmlDelen(pptxBytes, ["ppt/notesSlides/notesSlide"]);
  const dias = await xmlDelen(pptxBytes, ["ppt/slides/slide"]);
  const notitiesMet = notities.filter((xml) => xml.includes(AI_MELDING_EXPORT));
  controle(
    "elke dia heeft de vermelding in de notities",
    notitiesMet.length === dias.length && dias.length > 0,
    notitiesMet.length + " van " + dias.length + " dia's"
  );
  const titeldia = await xmlDelen(pptxBytes, ["ppt/slides/slide1.xml"]);
  controle(
    "de titeldia draagt de vermelding ook zichtbaar",
    titeldia.some((xml) => xml.includes(AI_MELDING_EXPORT))
  );

  console.log("PowerPoint in het vaste sjabloon");
  const sjabloonBytes = new Uint8Array(await bouwMihiribanPptxBuffer(les));
  const sjabloonDias = await xmlDelen(sjabloonBytes, ["ppt/slides/slide"]);
  const metVermelding = sjabloonDias.filter((xml) => xml.includes(AI_MELDING_EXPORT));
  // Twee lesblokken, dus twee titeldia's, dus twee keer de vermelding.
  controle(
    "de titeldia van elk lesblok draagt de vermelding",
    metVermelding.length === LES_INPUT.aantalLessen,
    metVermelding.length + " van " + LES_INPUT.aantalLessen + " lesblokken"
  );
  const sjabloonZip = await JSZip.loadAsync(sjabloonBytes);
  const media = Object.keys(sjabloonZip.files).filter((naam) =>
    naam.startsWith("ppt/media/")
  );
  controle(
    "het sjabloon is intact: de afbeeldingen staan er nog",
    media.length > 0,
    media.length + " media-bestanden"
  );

  console.log("Toets in Word");
  const toetsBytes = new Uint8Array(await Packer.toBuffer(bouwToetsDocument(toets)));
  const toetsVoeten = await xmlDelen(toetsBytes, ["word/footer"]);
  controle(
    "beide secties (vragen en antwoorden) hebben de vermelding in de voet",
    toetsVoeten.length >= 2 &&
      toetsVoeten.every((xml) => xml.includes(AI_MELDING_EXPORT)),
    toetsVoeten.length + " voetteksten"
  );

  console.log("Rapporttekst in Word");
  const rapportBytes = new Uint8Array(
    await Packer.toBuffer(bouwRapportDocument(rapport))
  );
  const rapportVoeten = await xmlDelen(rapportBytes, ["word/footer"]);
  controle(
    "de voet draagt de vermelding",
    rapportVoeten.length >= 1 &&
      rapportVoeten.every((xml) => xml.includes(AI_MELDING_EXPORT)),
    rapportVoeten.length + " voetteksten"
  );

  console.log("");
  if (fouten > 0) {
    console.error(fouten + " controle(s) mislukt.");
    process.exit(1);
  }
  console.log("Alle controles geslaagd.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
