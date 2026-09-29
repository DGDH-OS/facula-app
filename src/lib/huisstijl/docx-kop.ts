import { AlignmentType, Footer, Header, ImageRun, Paragraph, TextRun } from "docx";
import { AI_MELDING_EXPORT } from "../ai-transparantie";
import { docxBeeldType, passendeAfmeting, type Logo } from "./logo";
import { exportFont, zachteTekstKleur, zonderHekje, type Huisstijl } from "./themes";

/**
 * De paginakop met schoollogo en schoolnaam, gedeeld door de toets-export en
 * de rapport-export.
 *
 * Een Word-header herhaalt zichzelf op elke pagina, dus het logo staat op elk
 * vel zonder dat het per pagina toegevoegd hoeft te worden. Dat is precies wat
 * een docent verwacht van een toets die uit meerdere pagina's bestaat.
 */

const LOGO_MAX_BREEDTE_PX = 120;
const LOGO_MAX_HOOGTE_PX = 60;

/**
 * Geeft een Header terug, of undefined als er niets te tonen is. Undefined en
 * niet een lege Header: een lege header laat in Word alsnog witruimte staan
 * bovenaan elke pagina.
 */
export function bouwHuisstijlHeader(
  huisstijl: Huisstijl,
  logo: Logo | null
): Header | undefined {
  if (!logo && !huisstijl.schoolnaam) return undefined;

  const kinderen: (ImageRun | TextRun)[] = [];

  if (logo) {
    const maat = passendeAfmeting(logo, LOGO_MAX_BREEDTE_PX, LOGO_MAX_HOOGTE_PX);
    kinderen.push(
      new ImageRun({
        type: docxBeeldType(logo.mimeType),
        data: logo.bytes,
        transformation: {
          width: Math.round(maat.breedte),
          height: Math.round(maat.hoogte),
        },
        altText: {
          name: "Schoollogo",
          title: "Schoollogo",
          description: huisstijl.schoolnaam
            ? "Logo van " + huisstijl.schoolnaam
            : "Schoollogo",
        },
      })
    );
  }

  const paragrafen = [
    new Paragraph({ alignment: AlignmentType.LEFT, children: kinderen }),
  ];

  if (huisstijl.schoolnaam) {
    paragrafen.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: huisstijl.schoolnaam,
            size: 18,
            color: zonderHekje(zachteTekstKleur(huisstijl)),
            font: exportFont(huisstijl.lettertype),
          }),
        ],
      })
    );
  }

  return new Header({ children: paragrafen });
}

/**
 * De paginavoet met de AI-vermelding (AI-verordening art. 50), gedeeld door de
 * toets-export en de rapport-export.
 *
 * In de voet en niet in de tekst: een toets die je uitprint hoort de
 * mededeling te dragen zonder dat hij tussen de vragen staat. Een Word-voet
 * herhaalt zichzelf op elke pagina, dus ook het los uitgeprinte
 * antwoordenblad draagt hem.
 *
 * Anders dan de header is deze voet er altijd, ook zonder logo of schoolnaam:
 * de vermelding is geen opmaakkeuze van de docent maar een verplichting.
 */
export function bouwAiVoet(huisstijl: Huisstijl): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: AI_MELDING_EXPORT,
            size: 16,
            italics: true,
            color: zonderHekje(zachteTekstKleur(huisstijl)),
            font: exportFont(huisstijl.lettertype),
          }),
        ],
      }),
    ],
  });
}
