export const WERKDRUK_TAKEN = ["lessen voorbereiden", "toetsen maken", "nakijken", "rapporten", "oudergesprekken", "mails"] as const;
export type WerkdrukTaak = (typeof WERKDRUK_TAKEN)[number];
export function maakWeekplan(taken: WerkdrukTaak[]): string[] {
  const uniek = [...new Set(taken)];
  const plan = ["Kies per dag één hoofdtaak en houd een leeg blok voor onverwachte zaken."];
  if (uniek.includes("lessen voorbereiden")) plan.push("Bundel lesvoorbereiding in één blok en werk met één vast lesformat.");
  if (uniek.includes("toetsen maken")) plan.push("Maak eerst leerdoelen en een toetsmatrijs; controleer daarna pas de vormgeving.");
  if (uniek.includes("nakijken")) plan.push("Nakijken: werk per vraag in batches en gebruik drie vaste feedbackzinnen.");
  if (uniek.includes("rapporten")) plan.push("Rapporten: verzamel sterkte, aandachtspunt, voorbeeld en vervolgstap per tekst.");
  if (uniek.includes("oudergesprekken")) plan.push("Oudergesprekken: noteer vooraf één doel en één concrete afspraak.");
  if (uniek.includes("mails")) plan.push("Mails: plan twee antwoordmomenten en zet een stoptijd.");
  return plan;
}
