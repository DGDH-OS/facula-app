export type VerslagInput = {
  datum: string;
  aanwezigen: string;
  besproken: string;
  afspraken: { wie: string; wat: string; wanneer: string }[];
  vervolg: string;
};
export function maakVerslag(input: VerslagInput) {
  const afspraken =
    input.afspraken
      .filter((item) => item.wie || item.wat || item.wanneer)
      .map(
        (item) =>
          `- ${item.wie || "Wie"}: ${item.wat || "Wat"} (${item.wanneer || "Wanneer"})`,
      )
      .join("\n") || "- Nog geen afspraken genoteerd";
  return [
    "Verslag oudercontact",
    `Datum: ${input.datum || "nog invullen"}`,
    `Aanwezig: ${input.aanwezigen || "ouder/verzorger en docent"}`,
    "",
    "Besproken",
    input.besproken || "Nog invullen",
    "",
    "Afspraken",
    afspraken,
    "",
    "Vervolg",
    input.vervolg || "Nog invullen",
  ].join("\n");
}
export function verslagNaarMail(
  input: VerslagInput,
): { observatie: string; actie: string } {
  const actie = input.afspraken
    .filter((item) => item.wie || item.wat || item.wanneer)
    .map(
      (item) =>
        `${item.wie || "Wie"}: ${item.wat || "Wat"} (${item.wanneer || "Wanneer"})`,
    )
    .join("; ");
  return { observatie: input.besproken, actie };
}
