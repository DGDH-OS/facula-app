/**
 * Smoke test voor de huisstijl. Draait volledig lokaal, zonder netwerk:
 *
 *   npx tsx scripts/huisstijl-smoke.ts
 *
 * Controleert drie dingen die anders pas bij een docent stukgaan:
 *   1. elke meegeleverde stijl haalt de contrasteisen (4,5:1 voor tekst,
 *      3:1 voor accent), en een opzettelijk slechte eigen stijl wordt
 *      geweigerd;
 *   2. de PowerPoint- en Word-exports draaien in elke stijl zonder fout;
 *   3. het schoollogo zit echt in de bestanden (ppt/media, word/media) en de
 *      bestanden zijn geldige zips die een office-programma kan openen.
 *
 * Het testlogo wordt hier ter plekke gemaakt, zodat de test geen bestand van
 * buiten nodig heeft en dus overal draait.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import path from "node:path";
import JSZip from "jszip";
import { Packer } from "docx";
import type { GeneratedLesson, GeneratedReport, GeneratedTest } from "../src/lib/types";
import { genereerLes } from "../src/lib/lesson-generator";
import { genereerToets } from "../src/lib/test-generator";
import { genereerRapportTekst } from "../src/lib/report-generator";
import { bouwLesPresentatie } from "../src/lib/pptx-export";
import { bouwToetsDocument } from "../src/lib/docx-export";
import { bouwRapportDocument } from "../src/lib/report-docx-export";
import { maakLogo, type Logo, type LogoBestand } from "../src/lib/huisstijl/logo";
import {
  controleerContrast,
  PRESETS,
  resolveHuisstijl,
  type Huisstijl,
  type PresetNaam,
} from "../src/lib/huisstijl/themes";

const UITVOER_DIR = "/Users/r.h.wdegoededeheij/.hermes/cache/scratch/facula-huisstijl";

const fouten: string[] = [];

function eis(voorwaarde: boolean, melding: string) {
  if (!voorwaarde) fouten.push(melding);
}

/** CRC-32 zoals de PNG-specificatie hem voorschrijft, voor de chunk-checksums. */
const CRC_TABEL = (() => {
  const tabel = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabel[n] = c >>> 0;
  }
  return tabel;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = CRC_TABEL[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const naam = new TextEncoder().encode(type);
  const uit = new Uint8Array(12 + data.length);
  const view = new DataView(uit.buffer);
  view.setUint32(0, data.length);
  uit.set(naam, 4);
  uit.set(data, 8);
  view.setUint32(8 + data.length, crc32(uit.subarray(4, 8 + data.length)));
  return uit;
}

/**
 * Een echt, geldig PNG-bestand: een effen vlak van breedte bij hoogte.
 * Bewust niet vierkant in de aanroep hieronder, zodat een export die de
 * verhouding negeert zichtbaar zou worden in de afmetingen.
 */
function maakTestPng(breedte: number, hoogte: number): Uint8Array {
  const ruw = new Uint8Array(hoogte * (1 + breedte * 3));
  let p = 0;
  for (let y = 0; y < hoogte; y += 1) {
    ruw[p] = 0; // filtertype "geen"
    p += 1;
    for (let x = 0; x < breedte; x += 1) {
      ruw[p] = 0x16;
      ruw[p + 1] = 0x23;
      ruw[p + 2] = 0x3b;
      p += 3;
    }
  }

  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, breedte);
  ihdrView.setUint32(4, hoogte);
  ihdr[8] = 8; // bits per kanaal
  ihdr[9] = 2; // kleurtype RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const handtekening = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const delen = [
    handtekening,
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array(deflateSync(ruw))),
    chunk("IEND", new Uint8Array(0)),
  ];

  const totaal = delen.reduce((n, d) => n + d.length, 0);
  const png = new Uint8Array(totaal);
  let offset = 0;
  for (const deel of delen) {
    png.set(deel, offset);
    offset += deel.length;
  }
  return png;
}

const LEERDOEL =
  "De leerling kan drie kenmerken van de rechtsstaat noemen en toepassen op criminaliteitsbestrijding.";

const LES: GeneratedLesson = genereerLes({
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  lesduur: 50,
  aantalLessen: 2,
  leerdoel: LEERDOEL,
});

const TOETS: GeneratedTest = genereerToets({
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  leerdoel: LEERDOEL,
  kernbegrippen: "rechtsstaat, legaliteitsbeginsel, machtenscheiding",
  aantalVragen: 10,
});

const RAPPORT: GeneratedReport = genereerRapportTekst({
  leerlingLabel: "L.J.",
  aantekeningen:
    "Werkt geconcentreerd, levert opdrachten op tijd in, durft nog weinig te vragen in de klas.",
  outputType: "rapporttekst",
  toon: "vriendelijk-direct",
});

/** De stijlen die getest worden: alle presets plus een eigen combinatie. */
function testStijlen(): { naam: string; huisstijl: Huisstijl }[] {
  const presets = (Object.keys(PRESETS) as Exclude<PresetNaam, "eigen">[]).map((naam) => ({
    naam,
    huisstijl: resolveHuisstijl({
      preset: naam,
      schoolnaam: "Het Nieuwe Lyceum",
      logo_path: "test/logo.png",
      logo_standaard_aan: true,
    }),
  }));

  const eigen = resolveHuisstijl({
    preset: "eigen",
    accent: "#5B2333",
    tekst: "#1F1B16",
    achtergrond: "#FDFBF7",
    lettertype: "sans",
    schoolnaam: "Het Nieuwe Lyceum",
    logo_path: "test/logo.png",
    logo_standaard_aan: true,
  });

  return [...presets, { naam: "eigen", huisstijl: eigen }];
}

/**
 * Opent het bestand als zip en controleert dat er een afbeelding in de
 * media-map zit. Een office-bestand is een zip; laat JSZip zich er niet op
 * laden, dan kan PowerPoint of Word dat ook niet.
 */
async function controleerBestand(
  label: string,
  bytes: Uint8Array,
  mediaMap: string,
  logoVerwacht: boolean
): Promise<string[]> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch (err) {
    fouten.push(label + ": geen geldige zip (" + String(err) + ")");
    return [];
  }

  const media = Object.keys(zip.files).filter(
    (naam) => naam.startsWith(mediaMap) && !zip.files[naam].dir
  );

  if (logoVerwacht) {
    eis(media.length > 0, label + ": geen afbeelding gevonden in " + mediaMap);
  }

  // De inhoud moet ook echt uitpakbaar zijn, niet alleen in de index staan.
  for (const naam of media.slice(0, 3)) {
    const inhoud = await zip.files[naam].async("uint8array");
    eis(inhoud.length > 0, label + ": " + naam + " is leeg");
  }

  console.log(
    "  " +
      label.padEnd(34) +
      String(bytes.length).padStart(8) +
      " bytes, " +
      media.length +
      " media"
  );
  return media;
}

async function main() {
  await mkdir(UITVOER_DIR, { recursive: true });

  // Een bewust liggend logo (160x60): een export die de verhouding negeert
  // zou het logo hier zichtbaar vervormen.
  const pngBytes = maakTestPng(160, 60);
  const logoPad = path.join(UITVOER_DIR, "testlogo.png");
  await writeFile(logoPad, pngBytes);

  const logo = maakLogo(pngBytes, "image/png");
  if (!logo) throw new Error("Het zelfgemaakte testlogo werd niet als geldige PNG herkend.");
  eis(logo.breedte === 160, "logobreedte gelezen als " + logo.breedte + ", verwacht 160");
  eis(logo.hoogte === 60, "logohoogte gelezen als " + logo.hoogte + ", verwacht 60");

  const logoBestand: LogoBestand = { ...logo, pad: logoPad };
  const logoVoorDocx: Logo = logo;

  console.log("Contrast per stijl (eis: tekst >= 4,5 | accent >= 3,0)");
  for (const { naam, huisstijl } of testStijlen()) {
    const controle = controleerContrast(huisstijl);
    eis(
      controle.ok,
      naam + ": haalt de contrasteis niet (" + controle.meldingen.join(" ") + ")"
    );
    console.log(
      "  " +
        naam.padEnd(12) +
        "tekst " +
        controle.tekstRatio.toFixed(2).padStart(5) +
        " | accent " +
        controle.accentRatio.toFixed(2).padStart(5) +
        (controle.ok ? "  ok" : "  FOUT")
    );
  }

  // Een opzettelijk onleesbare eigen stijl hoort geweigerd te worden. Zonder
  // deze test zou een kapotte contrastcontrole onopgemerkt blijven: alle
  // meegeleverde stijlen slagen immers toch wel.
  const slecht = controleerContrast({
    accent: "#F7F3EC",
    tekst: "#DDD6C8",
    achtergrond: "#FAF6EF",
    lettertype: "sans",
  });
  eis(!slecht.ok, "een onleesbare eigen stijl werd ten onrechte goedgekeurd");
  eis(
    slecht.meldingen.length === 2,
    "onleesbare stijl gaf " + slecht.meldingen.length + " meldingen, verwacht 2"
  );
  console.log("  onleesbare eigen stijl wordt geweigerd: ok");

  console.log("");
  console.log("Exports per stijl, naar " + UITVOER_DIR);

  for (const { naam, huisstijl } of testStijlen()) {
    const pptx = bouwLesPresentatie(LES, { huisstijl, logo: logoBestand });
    const pptxBytes = (await pptx.write({ outputType: "nodebuffer" })) as Uint8Array;
    await writeFile(path.join(UITVOER_DIR, naam + "-les.pptx"), pptxBytes);
    const pptxMedia = await controleerBestand(naam + "-les.pptx", pptxBytes, "ppt/media/", true);
    // pptxgenjs schrijft het logo één keer per dia weg in plaats van één keer
    // per bestand. Dat is bekend gedrag en geen fout, maar het betekent wel
    // dat de grootte van het logo maal het aantal dia's gaat; vandaar de
    // waarschuwing bij een groot bestand op /app/huisstijl.
    eis(
      pptxMedia.length === LES.onderdelen.length * 8 + 1,
      naam + "-les.pptx: " + pptxMedia.length + " afbeeldingen, verwacht er een per dia"
    );

    const toetsDoc = bouwToetsDocument(TOETS, { huisstijl, logo: logoVoorDocx });
    const toetsBytes = new Uint8Array(await Packer.toBuffer(toetsDoc));
    await writeFile(path.join(UITVOER_DIR, naam + "-toets.docx"), toetsBytes);
    await controleerBestand(naam + "-toets.docx", toetsBytes, "word/media/", true);

    const rapportDoc = bouwRapportDocument(RAPPORT, { huisstijl, logo: logoVoorDocx });
    const rapportBytes = new Uint8Array(await Packer.toBuffer(rapportDoc));
    await writeFile(path.join(UITVOER_DIR, naam + "-rapport.docx"), rapportBytes);
    await controleerBestand(naam + "-rapport.docx", rapportBytes, "word/media/", true);
  }

  // Zonder logo moet het net zo goed werken, en dan hoort er ook geen
  // afbeelding in te zitten. Dat bewijst dat het logo echt uit de schakelaar
  // komt en niet ergens vast in de export zit.
  console.log("");
  console.log("Zelfde exports zonder logo");
  const zonderLogo = resolveHuisstijl({ preset: "facula", schoolnaam: null });

  const kaalPptx = (await bouwLesPresentatie(LES, { huisstijl: zonderLogo }).write({
    outputType: "nodebuffer",
  })) as Uint8Array;
  const kaalPptxMedia = await controleerBestand(
    "facula-les-zonder-logo.pptx",
    kaalPptx,
    "ppt/media/",
    false
  );
  eis(
    kaalPptxMedia.length === 0,
    "er zit een afbeelding in de PowerPoint terwijl het logo uit staat"
  );

  const kaalToets = new Uint8Array(
    await Packer.toBuffer(bouwToetsDocument(TOETS, { huisstijl: zonderLogo }))
  );
  const kaalToetsMedia = await controleerBestand(
    "facula-toets-zonder-logo.docx",
    kaalToets,
    "word/media/",
    false
  );
  eis(
    kaalToetsMedia.length === 0,
    "er zit een afbeelding in de toets terwijl het logo uit staat"
  );

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
