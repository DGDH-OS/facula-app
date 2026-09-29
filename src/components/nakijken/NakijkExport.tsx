import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import { maakFeedback } from "@/lib/nakijken/feedback";
import { controleerNakijkenPrivacy } from "@/lib/report-quality";
import type { Leerling, Rubric } from "@/lib/nakijken";
export function tekstVoorWordExport(rubric: Rubric, leerlingen: Leerling[]) {
  return [rubric.titel, ...rubric.criteria.flatMap((c) => [c.naam, ...c.niveaus.flatMap((n) => [n.label, n.descriptor]), c.sterkZin, c.groeiZin, c.volgendeStap]), ...leerlingen.flatMap((l) => [l.initialen, l.notitie, maakFeedback(rubric, l)])].join("\n");
}
export async function exporteerWordDocument(
  rubric: Rubric,
  leerlingen: Leerling[],
) {
  const privacy = controleerNakijkenPrivacy(tekstVoorWordExport(rubric, leerlingen));
  if (privacy.blokkeer) return privacy;
  const kinderen = leerlingen.flatMap((leerling) => [
    new Paragraph({
      text: leerling.initialen,
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph(maakFeedback(rubric, leerling)),
  ]);
  const blob = await Packer.toBlob(
    new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: rubric.titel || "Nakijkhulp",
              heading: HeadingLevel.HEADING_1,
            }),
            ...kinderen,
          ],
        },
      ],
    }),
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nakijkhulp-feedback.docx";
  link.click();
  URL.revokeObjectURL(url);
  return privacy;
}
