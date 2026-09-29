export const AANLEIDINGEN = [
  "Huiswerk niet gemaakt",
  "Compliment / positief nieuws",
  "Afwezig bij toets / inhalen",
  "Gedrag in de les",
  "Zorgen over resultaten",
  "Uitnodiging gesprek",
  "Afspraak bevestigen",
  "Terugkoppeling na gesprek",
  "Materiaal vergeten structureel",
  "Verbetering zichtbaar",
  "Schoolreis / activiteit info",
  "Reactie op boze mail (de-escalerend)",
] as const;
export type Aanleiding = (typeof AANLEIDINGEN)[number];
export type Toon = "vriendelijk" | "neutraal-zakelijk" | "duidelijk-formeel";
export type MailInput = {
  aanleiding: Aanleiding;
  aanhef: string;
  leerling: string;
  vak: string;
  observatie: string;
  observatie2: string;
  actie: string;
  toon: Toon;
  lengte: "kort" | "normaal";
  naam: string;
};
type Zinnen = {
  opening: string;
  context: string;
  observatie: string;
  verzoek: string;
  afsluiting: string;
};
const tonen: Toon[] = ["vriendelijk", "neutraal-zakelijk", "duidelijk-formeel"];
const onderwerpen: Record<Aanleiding, string> = {
  "Huiswerk niet gemaakt": "het huiswerk",
  "Compliment / positief nieuws": "goed nieuws",
  "Afwezig bij toets / inhalen": "het inhalen van de toets",
  "Gedrag in de les": "het gedrag in de les",
  "Zorgen over resultaten": "de resultaten",
  "Uitnodiging gesprek": "een gesprek over de voortgang",
  "Afspraak bevestigen": "onze gemaakte afspraak",
  "Terugkoppeling na gesprek": "de terugkoppeling na ons gesprek",
  "Materiaal vergeten structureel": "het lesmateriaal",
  "Verbetering zichtbaar": "de zichtbare verbetering",
  "Schoolreis / activiteit info": "de schoolreis of activiteit",
  "Reactie op boze mail (de-escalerend)": "uw bericht",
};
const kleuren: Record<Toon, string> = {
  vriendelijk: "vriendelijk",
  "neutraal-zakelijk": "zakelijk",
  "duidelijk-formeel": "formeel",
};
const bank: Record<Aanleiding, Record<Toon, Zinnen>> = {} as Record<
  Aanleiding,
  Record<Toon, Zinnen>
>;
for (const aanleiding of AANLEIDINGEN) {
  bank[aanleiding] = {} as Record<Toon, Zinnen>;
  for (const toon of tonen) {
    bank[aanleiding][toon] = {
      opening: `Ik schrijf u ${kleuren[toon]} over ${onderwerpen[aanleiding]}.`,
      context: `In de les voor [vak] geef ik u een terugkoppeling over [kind].`,
      observatie: `Ik zie dat [observatie].`,
      verzoek: `Zou u thuis met [kind] willen bespreken hoe [actie]?`,
      afsluiting: "Als u wilt afstemmen, hoor ik het graag.",
    };
  }
}
const eigen: Partial<
  Record<Aanleiding, Partial<Record<Toon, Partial<Zinnen>>>>
> = {
  "Huiswerk niet gemaakt": {
    vriendelijk: {
      opening: "Ik wil u graag bijpraten over het huiswerk.",
      context:
        "Ik merk dat [kind] bij [vak] goed meedoet, terwijl de opdracht nog niet is ingeleverd.",
      verzoek: "Zou u thuis met [kind] willen bespreken hoe [actie]?",
    },
    "neutraal-zakelijk": {
      opening: "Hierbij informeer ik u over het openstaande huiswerk.",
      context:
        "Voor [vak] staat de opdracht van [kind] nog als niet ingeleverd geregistreerd.",
      verzoek: "Wilt u met [kind] bespreken hoe [actie]?",
    },
    "duidelijk-formeel": {
      opening: "Ik informeer u over een openstaande huiswerkopdracht.",
      context:
        "Voor [vak] heeft [kind] de afgesproken opdracht nog niet ingeleverd.",
      verzoek: "Ik verzoek u met [kind] te bespreken hoe [actie].",
    },
  },
  "Compliment / positief nieuws": {
    vriendelijk: {
      opening: "Ik heb fijn nieuws over [kind].",
      context: "Bij [vak] laat [kind] een betrokken werkhouding zien.",
      verzoek: "Deel dit gerust thuis.",
      afsluiting: "Het is mooi om deze ontwikkeling te zien.",
    },
    "neutraal-zakelijk": {
      opening: "Graag deel ik positief nieuws over [kind].",
      context:
        "Tijdens [vak] werkt [kind] geconcentreerd en draagt [kind] prettig bij.",
      verzoek: "Deel dit gerust thuis.",
      afsluiting: "Ik wilde deze positieve ontwikkeling graag met u delen.",
    },
    "duidelijk-formeel": {
      opening: "Ik meld u graag een positieve ontwikkeling bij [kind].",
      context: "Tijdens [vak] past [kind] de lesafspraken zichtbaar toe.",
      verzoek: "Deel dit gerust thuis.",
      afsluiting: "Deze ontwikkeling verdient erkenning.",
    },
  },
  "Reactie op boze mail (de-escalerend)": {
    vriendelijk: {
      opening:
        "Dank voor uw bericht. Ik begrijp dat u zich zorgen maakt over [onderwerp].",
      context: "Ik zet de feiten uit de les graag rustig naast elkaar.",
      observatie: "In mijn aantekeningen staat dat [observatie].",
      verzoek:
        "Zou u dinsdag om 15.30 uur of donderdag om 08.15 uur willen bellen over [actie]?",
      afsluiting: "Ik zoek graag samen met u naar een passende volgende stap.",
    },
    "neutraal-zakelijk": {
      opening:
        "Dank voor uw bericht. Ik begrijp dat u zich zorgen maakt over [onderwerp].",
      context: "Voor de duidelijkheid vat ik de situatie feitelijk samen.",
      observatie: "Tijdens [vak] heb ik genoteerd dat [observatie].",
      verzoek:
        "Ik stel voor dat we dinsdag om 15.30 uur of donderdag om 08.15 uur bellen over [actie].",
      afsluiting: "Zo kunnen we uw zorgen zorgvuldig bespreken.",
    },
    "duidelijk-formeel": {
      opening:
        "Dank voor uw bericht. Ik begrijp dat u zich zorgen maakt over [onderwerp].",
      context: "Ik wil de situatie neutraal en controleerbaar met u doornemen.",
      observatie: "De beschikbare informatie vermeldt dat [observatie].",
      verzoek:
        "Ik nodig u uit op dinsdag om 15.30 uur of donderdag om 08.15 uur voor overleg over [actie].",
      afsluiting: "Dan leggen we een gezamenlijke vervolgstap vast.",
    },
  },
  "Schoolreis / activiteit info": {
    vriendelijk: {
      opening: "Graag geef ik u praktische informatie over de schoolreis.",
      context: "We gaan op [datum] naar [locatie] en vertrekken om [tijd].",
      observatie: "Neem [meenemen] mee.",
      verzoek: "Heeft u vragen over [actie]? Laat het gerust weten.",
      afsluiting: "We kijken uit naar een fijne dag.",
    },
    "neutraal-zakelijk": {
      opening: "Hierbij ontvangt u de informatie over de schoolreis.",
      context:
        "De activiteit vindt plaats op [datum] bij [locatie]; vertrek is om [tijd].",
      observatie: "[kind] neemt [meenemen] mee.",
      verzoek:
        "Heeft u vragen over [actie], dan kunt u die per mail doorgeven.",
      afsluiting: "De begeleiders zien de groep bij het vertrekpunt.",
    },
    "duidelijk-formeel": {
      opening: "Ik informeer u over de organisatie van de schoolreis.",
      context: "Op [datum] bezoeken we [locatie] en vertrekken we om [tijd].",
      observatie: "Voor [kind] is [meenemen] nodig.",
      verzoek: "Wilt u vragen over [actie] vooraf doorgeven?",
      afsluiting: "Deze informatie helpt bij een zorgvuldig verloop.",
    },
  },
};
for (const aanleiding of AANLEIDINGEN)
  for (const toon of tonen) {
    bank[aanleiding][toon] = {
      ...bank[aanleiding][toon],
      ...eigen[aanleiding]?.[toon],
    };
  }
function middenin(tekst: string, fallback: string) {
  const schoon = tekst.trim().replace(/[.!?]+$/, "");
  return schoon ? schoon.charAt(0).toLowerCase() + schoon.slice(1) : fallback;
}
function vul(tekst: string, waarden: Record<string, string>) {
  return tekst.replace(
    /\[([^\]]+)\]/g,
    (_, sleutel: string) => waarden[sleutel] ?? "",
  );
}
export function maakOudermail(input: MailInput) {
  const kind = input.leerling.trim() || "uw kind";
  const vak = input.vak.trim() || "de les";
  const zinnen = bank[input.aanleiding][input.toon];
  const waarden = {
    kind,
    vak,
    observatie: middenin(input.observatie, "de opdracht wordt uitgevoerd"),
    actie: middenin(input.actie, "de opdracht wordt afgerond"),
    onderwerp: "de situatie",
  };
  const compliment = input.aanleiding === "Compliment / positief nieuws";
  const regels = [
    vul(zinnen.opening, waarden),
    vul(zinnen.context, waarden),
    vul(zinnen.observatie, waarden),
    vul(zinnen.verzoek, waarden),
    vul(zinnen.afsluiting, waarden),
  ];
  if (input.observatie2.trim() && compliment)
    regels[2] += ` Ook zie ik dat ${middenin(input.observatie2, "de inzet groeit")}.`;
  if (
    input.lengte === "normaal" &&
    !compliment &&
    input.aanleiding !== "Reactie op boze mail (de-escalerend)"
  )
    regels.splice(
      3,
      0,
      `Daarnaast valt op dat ${middenin(input.observatie2, "de aanpak nog aandacht vraagt")}.`,
    );
  const naam = input.naam.trim() || "De docent";
  const body = [
    `${input.aanhef.trim() || "Beste ouder(s)/verzorger(s)"},`,
    "",
    regels.join("\n\n"),
    "",
    "Met vriendelijke groet,",
    naam,
  ].join("\n");
  return {
    subject: `${onderwerpen[input.aanleiding]}${vak === "de les" ? "" : ` bij ${vak}`}`,
    body,
  };
}
export { bank as OUDERMAIL_PHRASE_BANK };
export { maakGespreksplanning, type GesprekInput } from "./gesprek";
export { maakVerslag, type VerslagInput } from "./verslag";
export { privacyOuders } from "./privacy";
