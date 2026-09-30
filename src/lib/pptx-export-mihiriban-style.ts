import path from "path";
import { Automizer, modify, type ISlide } from "pptx-automizer";
import type { GeneratedLesson, LessonPart, LessonSection } from "./types";
import { slugify } from "./pptx-export";
import { AI_MELDING_EXPORT } from "./ai-transparantie";
import { passendeAfmeting, type LogoBestand } from "./huisstijl/logo";
import {
  afdwingenSlideRegels,
  afdwingenVolledigeZin,
  MAX_WOORDEN_BOEKDEFINITIE,
} from "./slide-content-rules";

/**
 * Bouwt een PowerPoint in Mihiriban's eigen sjabloon-stijl (oranje/terracotta,
 * Rockwell, grunge-titelbalken en cirkel-badges) op basis van
 * src/templates/mihiriban-template.pptx.
 *
 * Techniek: pptx-automizer dupliceert de 9 bestaande sjabloonslides en
 * vervangt alleen de tekst-placeholders (Titel 1 / "Tijdelijke aanduiding
 * voor inhoud 2") — afbeeldingen, achtergrond, kleuren en fonts van het
 * sjabloon blijven volledig intact omdat we nooit een generieke slide bouwen,
 * enkel bestaande sjabloonslides klonen.
 *
 * Sjabloon-slidevolgorde (vast, 9 slides):
 *   1 titel · 2 introductie · 3 leerdoelen · 4 kernbegrippen · 5 casus ·
 *   6 voorbeeld uitgewerkt · 7 opdracht in tweetallen · 8 bespreken · 9 huiswerk
 *
 * De generator (genereerLes) levert per lesdeel INMIDDELS 8 secties op (EDI-
 * uitbreiding: 1. terugblik & activering, 2. leerdoel & kernbegrippen,
 * 3. casus, 4. voorbeeld, 5. begeleide inoefening & check-for-understanding,
 * 6. opdracht, 7. bespreken, 8. huiswerk) — het sjabloon heeft een VAST
 * aantal van 9 slides en kan niet zomaar 2 extra content-slides krijgen.
 * Oplossing: de twee nieuwe secties worden gecombineerd op een bestaande
 * sjabloonslide i.p.v. een eigen slide te krijgen (zie combineerRegels
 * hierboven), zodat het sjabloon-gebaseerde exportsysteem niet crasht:
 *   - terugblik (1.) → samengevoegd op slide 2 "introductie"
 *   - begeleide inoefening (5.) → samengevoegd op slide 6 "voorbeeld uitgewerkt"
 * Bij meerdere lessen (aantalLessen > 1) wordt dit 9-slides-blok herhaald per
 * lesdeel — elk blok krijgt in de titelslide een "Les N van M"-aanduiding,
 * zodat alle lessen in de output terechtkomen (bug: voorheen alleen
 * onderdelen[0]).
 */

const TEMPLATE_FILE = "mihiriban-template.pptx";
const TEMPLATE_DIR = path.join(process.cwd(), "src", "templates");

/**
 * De diamaat van het sjabloon, in inch (12192000 x 6858000 EMU, dus 16:9).
 * Nodig om het logo rechtsboven te kunnen plaatsen: pptx-automizer rekent in
 * inch en kent de maat van het sjabloon niet uit zichzelf.
 */
const DIA_BREEDTE_INCH = 13.333;
const LOGO_MAX_BREEDTE = 1.1;
const LOGO_MAX_HOOGTE = 0.55;
const LOGO_MARGE = 0.4;

export interface MihiribanExportOpties {
  /**
   * Alleen het logo, geen kleuren of lettertype: dit sjabloon ís al een
   * huisstijl. De kleuren, fonts en afbeeldingen komen uit het bestand zelf en
   * die overschrijven zou precies weghalen waarom een docent dit sjabloon
   * gebruikt.
   */
  logo?: LogoBestand | null;
}

const TITEL_SHAPE = "Titel 1";
const INHOUD_SHAPE = "Tijdelijke aanduiding voor inhoud 2";
const ONDERTITEL_SHAPE = "Ondertitel 2";

/**
 * Voegt twee bullet-lijsten samen tot één slide-body die nog steeds aan de
 * content-guardrails voldoet (max 4 bullets, max 30 woorden totaal) — nodig
 * omdat het vaste 9-slides-sjabloon geen eigen slide heeft voor de twee
 * nieuwe EDI-secties (terugblik, begeleide inoefening) en deze daarom
 * gecombineerd worden op een bestaande content-slide. Pakt eerst de
 * belangrijkste regel(s) van `primair`, vult aan met `secundair` tot de
 * bullet-limiet, en laat afdwingenSlideRegels de rest (woordlimieten)
 * garanderen zodat dit nooit een slide met te veel tekst oplevert.
 */
function combineerRegels(primair: string[], secundair: string[], maxBullets = 4): string[] {
  const primaireSlice = primair.slice(0, Math.max(1, maxBullets - 1));
  const ruimte = maxBullets - primaireSlice.length;
  const secundaireSlice = ruimte > 0 ? secundair.slice(0, ruimte) : [];
  return afdwingenSlideRegels([...primaireSlice, ...secundaireSlice], { maxBullets });
}

function vindSectie(secties: LessonSection[], nummerPrefix: string): LessonSection | undefined {
  return secties.find((s) => s.titel.startsWith(nummerPrefix));
}

/**
 * Voor actie-bullets (casus/opdracht/bespreken/huiswerk/introductie): mogen
 * kort en fragmentarisch blijven, generieke 7-woorden-bullet-regel van
 * toepassing.
 */
function alsMultiText(regels: string[]) {
  const gefilterd = afdwingenSlideRegels(regels)
    .map((r) => r.trim())
    .filter(Boolean);
  if (gefilterd.length === 0) {
    return [{ paragraph: {}, text: " " }];
  }
  return gefilterd.map((text) => ({ paragraph: {}, text }));
}

/**
 * Voor content die grammaticaal COMPLEET moet blijven: het volledige leerdoel
 * op de Leerdoelen-slide. Gebruikt afdwingenVolledigeZin i.p.v. de generieke
 * bullet-trim, zodat de zin nooit midden-in wordt afgekapt (bug 2).
 */
function alsMultiTextVolledigeZin(regels: string[]) {
  const gefilterd = regels
    .map((r) => afdwingenVolledigeZin(r))
    .map((r) => r.trim())
    .filter(Boolean);
  if (gefilterd.length === 0) {
    return [{ paragraph: {}, text: " " }];
  }
  return gefilterd.map((text) => ({ paragraph: {}, text }));
}

/**
 * Voor de "Label: definitie"-bullets in de kernbegrippen-sectie: deze zijn al
 * grammaticaal compleet opgebouwd door lesson-generator.ts (met
 * MAX_WOORDEN_BOEKDEFINITIE). Hier NIET nogmaals door de generieke
 * 7-woorden-bullet-trim halen — dat zou de definitie alsnog midden-in
 * afknippen (bug 3). Wel de maxBullets-limiet en filtering op lege regels
 * behouden, maar met dezelfde ruimere per-bullet/totaal-limiet.
 */
function alsMultiTextDefinities(regels: string[]) {
  const gefilterd = afdwingenSlideRegels(regels, {
    maxBullets: regels.length,
    maxWoordenPerBullet: MAX_WOORDEN_BOEKDEFINITIE,
    maxTotaalWoorden: regels.length * MAX_WOORDEN_BOEKDEFINITIE,
  })
    .map((r) => r.trim())
    .filter(Boolean);
  if (gefilterd.length === 0) {
    return [{ paragraph: {}, text: " " }];
  }
  return gefilterd.map((text) => ({ paragraph: {}, text }));
}

export async function bouwMihiribanPptxBuffer(
  les: GeneratedLesson,
  opties: MihiribanExportOpties = {}
): Promise<Buffer> {
  if (les.onderdelen.length === 0) {
    throw new Error("Les bevat geen onderdelen om te exporteren.");
  }

  const aantalLessen = les.onderdelen.length;
  const logo = opties.logo ?? null;
  const logoMaat = logo ? passendeAfmeting(logo, LOGO_MAX_BREEDTE, LOGO_MAX_HOOGTE) : null;

  /**
   * Zet het schoollogo rechtsboven op een sjabloondia. `generate` laat
   * pptx-automizer een echt pptxgenjs-element op de gekloonde dia zetten, dus
   * het sjabloon zelf blijft ongemoeid: alleen dit ene element komt erbij.
   */
  const metLogo = (slide: ISlide) => {
    if (!logo || !logoMaat) return;
    slide.generate((gen) => {
      gen.addImage({
        path: logo.pad,
        x: DIA_BREEDTE_INCH - LOGO_MARGE - logoMaat.breedte,
        y: 0.25,
        w: logoMaat.breedte,
        h: logoMaat.hoogte,
      });
    }, "Schoollogo");
  };

  /**
   * De AI-vermelding onderaan de titeldia (AI-verordening art. 50).
   *
   * Langs dezelfde weg als het logo: `generate` laat pptx-automizer één
   * pptxgenjs-element op de gekloonde dia zetten, dus het sjabloon zelf blijft
   * ongemoeid. Bewust alleen op de titeldia en niet op alle negen: de
   * mededeling hoort in het bestand te staan, niet negen keer op de beamer.
   *
   * Notities zouden hier eleganter zijn, maar pptx-automizer kan geen
   * notitieslide toevoegen aan een gekloonde dia zonder dat het sjabloon er
   * één heeft. Eén kleine regel in beeld is daarom de veilige weg.
   */
  const metAiVermelding = (slide: ISlide) => {
    slide.generate((gen) => {
      gen.addText(AI_MELDING_EXPORT, {
        x: LOGO_MARGE,
        y: 6.85,
        w: DIA_BREEDTE_INCH - 2 * LOGO_MARGE,
        h: 0.3,
        fontSize: 9,
        color: "6B5B4C",
        align: "right",
      });
    }, "AI-vermelding");
  };

  // Let op: cleanup:true laat pptx-automizer "ongebruikte" media weghalen op
  // basis van slide-relaties — image1.jpeg wordt echter alleen door
  // theme1.xml (achtergrond) gerefereerd en werd daardoor foutief verwijderd.
  // cleanup blijft daarom uit, zodat alle 7 sjabloon-afbeeldingen behouden
  // blijven (geverifieerd met python-pptx/zipfile, zie taakverificatie).
  const automizer = new Automizer({
    templateDir: TEMPLATE_DIR,
    outputDir: undefined,
    removeExistingSlides: true,
  });

  const pres = automizer
    .loadRoot(TEMPLATE_FILE)
    .load(TEMPLATE_FILE, "tpl");

  const voegLesBlokToe = (deel: LessonPart, idx: number) => {
    const terugblikSectie = vindSectie(deel.secties, "1.");
    const leerdoelSectie = vindSectie(deel.secties, "2.");
    const casusSectie = vindSectie(deel.secties, "3.");
    const voorbeeldSectie = vindSectie(deel.secties, "4.");
    const inoefeningSectie = vindSectie(deel.secties, "5.");
    const opdrachtSectie = vindSectie(deel.secties, "6.");
    const besprekenSectie = vindSectie(deel.secties, "7.");
    const huiswerkSectie = vindSectie(deel.secties, "8.");

    const kernbegrippenRegels =
      (leerdoelSectie?.inhoud ?? []).length > 1
        ? (leerdoelSectie?.inhoud ?? []).slice(1)
        : les.kernbegrippen;

    // Let op: het volledige leerdoel gaat NIET door alsMultiText (7-woorden-
    // trim) — dat kapte hem eerder af tot "je kunt opnoemen en uitleggen wat"
    // (bug 2, ook hier aanwezig naast de Leerdoelen-slide). Introductie krijgt
    // daarom alleen een korte kernwoorden-regel, het volledige leerdoel staat
    // al ongeknipt op de volgende (Leerdoelen-)slide.
    //
    // De nieuwe terugblik-sectie (EDI-fase 1) heeft geen eigen slide in het
    // vaste 9-slides-sjabloon — hij wordt daarom SAMENGEVOEGD met de
    // introductieslide (combineerRegels), zodat de activeringsvraag zichtbaar
    // blijft zonder een extra slide nodig te hebben.
    const introBasis = [
      les.kernbegrippen.length > 0
        ? `Kernbegrippen vandaag: ${les.kernbegrippen.slice(0, 4).join(", ")}`
        : "Zie leerdoel op volgende slide",
    ];
    const introRegels = combineerRegels(introBasis, terugblikSectie?.inhoud ?? []);

    // De nieuwe begeleide-inoefening-sectie (EDI-fase 4, check-for-
    // understanding) heeft evenmin een eigen sjabloonslide — samengevoegd met
    // de "voorbeeld uitgewerkt"-slide, direct ervoor in de EDI-volgorde.
    const voorbeeldMetInoefening = combineerRegels(
      voorbeeldSectie?.inhoud ?? [],
      inoefeningSectie?.inhoud ?? []
    );

    const ondertitelKort =
      les.kernbegrippen.slice(0, 3).join(", ") || les.titel;
    const lesLabel = aantalLessen > 1 ? `Les ${idx + 1} van ${aantalLessen}` : "Les 1";

    // Slide — titel (per lesdeel, met "Les N van M"-aanduiding bij meerdere lessen)
    pres.addSlide("tpl", 1, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText(`${les.input.vak} ${les.input.niveau} ${les.input.leerjaar}`));
      slide.modifyElement(ONDERTITEL_SHAPE, modify.setText(`${lesLabel} · ${ondertitelKort}`));
      metLogo(slide);
      metAiVermelding(slide);
    });

    // Slide — introductie (incl. terugblik/activering)
    pres.addSlide("tpl", 2, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Introductie"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(introRegels)));
      metLogo(slide);
    });

    // Slide — leerdoelen
    pres.addSlide("tpl", 3, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Leerdoelen"));
      slide.modifyElement(
        INHOUD_SHAPE,
        modify.setMultiText(alsMultiTextVolledigeZin([les.input.leerdoel]))
      );
      metLogo(slide);
    });

    // Slide — kernbegrippen
    pres.addSlide("tpl", 4, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Kernbegrippen"));
      slide.modifyElement(
        INHOUD_SHAPE,
        modify.setMultiText(alsMultiTextDefinities(kernbegrippenRegels))
      );
      metLogo(slide);
    });

    // Slide — casus
    pres.addSlide("tpl", 5, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText(`Casus: ${les.input.vak.toLowerCase()}`));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(casusSectie?.inhoud ?? [])));
      metLogo(slide);
    });

    // Slide — voorbeeld uitgewerkt (incl. begeleide inoefening/check)
    pres.addSlide("tpl", 6, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Voorbeeld & check"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(voorbeeldMetInoefening)));
      metLogo(slide);
    });

    // Slide — opdracht in tweetallen
    pres.addSlide("tpl", 7, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Opdracht in tweetallen"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(opdrachtSectie?.inhoud ?? [])));
      metLogo(slide);
    });

    // Slide — bespreken
    pres.addSlide("tpl", 8, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Bespreken"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(besprekenSectie?.inhoud ?? [])));
      metLogo(slide);
    });

    // Slide — huiswerk
    pres.addSlide("tpl", 9, (slide) => {
      slide.modifyElement(TITEL_SHAPE, modify.setText("Huiswerk"));
      slide.modifyElement(INHOUD_SHAPE, modify.setMultiText(alsMultiText(huiswerkSectie?.inhoud ?? [])));
      metLogo(slide);
    });
  };

  les.onderdelen.forEach((deel, idx) => voegLesBlokToe(deel, idx));

  const zip = await pres.getJSZip();
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return buffer;
}

export function mihiribanBestandsnaam(les: GeneratedLesson): string {
  return `${slugify(les.titel)}-mihiriban.pptx`;
}
