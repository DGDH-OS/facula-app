export type GesprekInput = {
  doel: string;
  sterk: string[];
  aandacht: string[];
  vraag: string;
  afspraak: string;
  minuten: 10 | 20;
};
export function maakGespreksplanning(input: GesprekInput) {
  const tijden = input.minuten === 10 ? [1, 2, 2, 2, 2, 1] : [2, 4, 4, 4, 3, 3];
  const doel = input.doel || "de ontwikkeling van uw kind";
  const sterk =
    input.sterk
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n") || "- Noteer een zichtbaar sterk punt.";
  const aandacht =
    input.aandacht
      .filter(Boolean)
      .map((item) => `- ${item}`)
      .join("\n") || "- Noteer waarneembaar gedrag dat aandacht vraagt.";
  const agenda = [
    "Opening",
    "Sterke punten",
    "Aandachtspunten",
    "Ouder aan het woord",
    "Afspraken",
    "Afsluiting",
  ]
    .map((naam, index) => `- ${tijden[index]} min: ${naam}`)
    .join("\n");
  const vragen = [
    input.vraag || "Wat herkent u hiervan thuis?",
    "Wanneer ziet u dit gedrag vooral?",
    "Wat zou thuis een haalbare volgende stap zijn?",
  ];
  const tekst = [
    `Gespreksplanning (${input.minuten} minuten)`,
    "",
    `Openingszin: Fijn dat u er bent. Vandaag wil ik het graag hebben over ${doel}.`,
    "",
    "Agenda",
    agenda,
    "",
    "Sterke punten",
    sterk,
    "",
    "Aandachtspunten",
    aandacht,
    "",
    "Doorvragen",
    vragen.map((vraag) => `- ${vraag}`).join("\n"),
    "",
    "Afspraak",
    input.afspraak ||
      "Spreek één concrete volgende stap en een moment van terugkijken af.",
  ].join("\n");
  return { tijden, tekst };
}
