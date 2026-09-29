import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { privacyOuders } from "./templates";
export async function downloadOudersWord(titel: string, tekst: string) {
  const privacy = privacyOuders(tekst);
  if (privacy.blokkeer) return privacy;
  const doc = new Document({ sections: [{ children: [new Paragraph({ text: titel, heading: HeadingLevel.HEADING_1 }), ...tekst.split("\n").map((regel) => new Paragraph({ children: [new TextRun(regel)] }))] }] });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `${titel.toLowerCase().replaceAll(" ", "-")}.docx`; link.click(); URL.revokeObjectURL(url);
  return privacy;
}
