import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import { maakFeedback } from "@/lib/nakijken/feedback";
import type { Leerling, Rubric } from "@/lib/nakijken";
export async function exporteerWordDocument(
  rubric: Rubric,
  leerlingen: Leerling[],
) {
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
}
