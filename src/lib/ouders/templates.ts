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
  datum: string;
  locatie: string;
  tijd: string;
  meenemen: string;
  belmomenten: string;
};
type ToonTekst = { opening: string; context: string; afsluiting: string };
type Sjabloon = {
  subject: (vak: string, kind: string) => string;
  observatieLabel: string | null;
  actieLabel: string | null;
  vasteVerzoek?: string;
  tonen: Record<Toon, ToonTekst>;
};

function heeftVak(vak: string) {
  return vak !== "de les";
}

function vul(tekst: string, waarden: Record<string, string>) {
  return tekst.replace(
    /\[([^\]]+)\]/g,
    (_, sleutel: string) => waarden[sleutel] ?? "",
  );
}

function normaliseer(tekst: string): string {
  const schoon = tekst.trim().replace(/[.!?]+$/, "");
  if (!schoon) return "";
  return schoon.charAt(0).toUpperCase() + schoon.slice(1) + ".";
}

function zinMet(label: string, tekst: string): string {
  const inhoud = normaliseer(tekst);
  if (!inhoud) return "";
  // Dutch: lowercase after a colon, but keep initials/acronyms such as "L.J." or "LJ".
  const klein = /^[A-ZÀ-Ý][a-zà-ÿ]/.test(inhoud)
    ? inhoud.charAt(0).toLowerCase() + inhoud.slice(1)
    : inhoud;
  return `${label}: ${klein}`;
}

const bank: Record<Aanleiding, Sjabloon> = {
  "Huiswerk niet gemaakt": {
    subject: (vak) =>
      heeftVak(vak) ? `Huiswerk ${vak}: even afstemmen` : "Huiswerk: even afstemmen",
    observatieLabel: "Wat ik zag",
    actieLabel: "Mijn voorstel",
    tonen: {
      vriendelijk: {
        opening: "Ik wil u even bijpraten over het huiswerk.",
        context:
          "Bij [vak] doet [kind] goed mee in de les, maar de opdracht staat nog open.",
        afsluiting: "Fijn als dit thuis nog even een plekje krijgt.",
      },
      "neutraal-zakelijk": {
        opening: "Ik informeer u over het openstaande huiswerk.",
        context:
          "Voor [vak] staat de opdracht van [kind] nog als niet ingeleverd geregistreerd.",
        afsluiting: "Ik hoor graag of dit lukt.",
      },
      "duidelijk-formeel": {
        opening: "Ik informeer u over een openstaande huiswerkopdracht.",
        context: "Voor [vak] heeft [kind] de afgesproken opdracht nog niet ingeleverd.",
        afsluiting: "Ik verwacht de opdracht op korte termijn alsnog te ontvangen.",
      },
    },
  },
  "Compliment / positief nieuws": {
    subject: (vak, kind) =>
      heeftVak(vak) ? `Compliment voor ${kind} bij ${vak}` : `Compliment voor ${kind}`,
    observatieLabel: "Wat mij opviel",
    actieLabel: null,
    vasteVerzoek: "Deel dit gerust thuis.",
    tonen: {
      vriendelijk: {
        opening: "Ik heb fijn nieuws over [kind].",
        context: "Bij [vak] laat [kind] deze periode een fijne, betrokken werkhouding zien.",
        afsluiting: "Het doet me goed om dit te mogen melden.",
      },
      "neutraal-zakelijk": {
        opening: "Graag deel ik positief nieuws over [kind].",
        context: "Tijdens [vak] werkt [kind] geconcentreerd en levert [kind] een prettige bijdrage.",
        afsluiting: "Ik wilde u hiervan op de hoogte stellen.",
      },
      "duidelijk-formeel": {
        opening: "Ik meld u een positieve ontwikkeling bij [kind].",
        context: "Tijdens [vak] past [kind] de gemaakte afspraken zichtbaar en consistent toe.",
        afsluiting: "Deze ontwikkeling verdient wat mij betreft erkenning.",
      },
    },
  },
  "Afwezig bij toets / inhalen": {
    subject: (vak) =>
      heeftVak(vak) ? `Toets ${vak}: moment om in te halen` : "Toets inhalen: moment plannen",
    observatieLabel: "Wat ik zie",
    actieLabel: "Voorstel voor het inhalen",
    tonen: {
      vriendelijk: {
        opening: "Ik wil u laten weten dat [kind] de toets heeft gemist.",
        context: "Bij [vak] was [kind] er niet bij toen de toets werd afgenomen.",
        afsluiting: "Samen vinden we vast snel een goed moment.",
      },
      "neutraal-zakelijk": {
        opening: "Ik informeer u over de gemiste toets bij [vak].",
        context: "[kind] was afwezig op het moment dat de toets werd afgenomen.",
        afsluiting: "Graag stem ik met u een inhaalmoment af.",
      },
      "duidelijk-formeel": {
        opening: "Ik informeer u dat [kind] de toets voor [vak] heeft gemist.",
        context: "De toets is bij afwezigheid van [kind] niet afgenomen.",
        afsluiting: "Ik verzoek u tijdig een inhaalmoment te bevestigen.",
      },
    },
  },
  "Gedrag in de les": {
    subject: (vak) => (heeftVak(vak) ? `Gedrag in de les bij ${vak}` : "Gedrag in de les"),
    observatieLabel: "Wat ik in de les zie",
    actieLabel: "Mijn voorstel",
    tonen: {
      vriendelijk: {
        opening: "Ik wil u iets vertellen over het gedrag van [kind] in de les.",
        context: "Tijdens [vak] valt het gedrag van [kind] de laatste tijd op.",
        afsluiting: "Ik denk graag met u mee over een aanpak.",
      },
      "neutraal-zakelijk": {
        opening: "Ik informeer u over het gedrag van [kind] tijdens de les.",
        context: "Tijdens [vak] laat [kind] gedrag zien dat de les verstoort.",
        afsluiting: "Ik hoor graag hoe u er thuis tegenaan kijkt.",
      },
      "duidelijk-formeel": {
        opening: "Ik informeer u over het gedrag van [kind] tijdens de lessen [vak].",
        context: "Het gedrag van [kind] wijkt herhaaldelijk af van de klassenregels.",
        afsluiting: "Ik verwacht van u een reactie op deze situatie.",
      },
    },
  },
  "Zorgen over resultaten": {
    subject: (vak) =>
      heeftVak(vak)
        ? `Resultaten ${vak}: een moment van afstemmen`
        : "De resultaten: een moment van afstemmen",
    observatieLabel: "Wat ik zie",
    actieLabel: "Mijn voorstel voor een plan",
    tonen: {
      vriendelijk: {
        opening: "Ik maak me een beetje zorgen over de resultaten van [kind].",
        context: "Bij [vak] lopen de resultaten van [kind] de laatste tijd terug.",
        afsluiting: "Samen kijken we vast naar wat helpt.",
      },
      "neutraal-zakelijk": {
        opening: "Ik wil u informeren over de resultaten van [kind].",
        context: "Voor [vak] blijven de resultaten van [kind] achter bij wat ik verwacht.",
        afsluiting: "Ik denk graag met u mee over een plan van aanpak.",
      },
      "duidelijk-formeel": {
        opening: "Ik informeer u over de resultaten van [kind] voor [vak].",
        context: "De resultaten van [kind] liggen structureel onder het verwachte niveau.",
        afsluiting: "Ik stel voor op korte termijn een plan van aanpak af te spreken.",
      },
    },
  },
  "Uitnodiging gesprek": {
    subject: (vak) =>
      heeftVak(vak) ? `Uitnodiging voor een gesprek over ${vak}` : "Uitnodiging voor een gesprek",
    observatieLabel: "Aanleiding voor het gesprek",
    actieLabel: "Mijn voorstel",
    tonen: {
      vriendelijk: {
        opening: "Ik zou u graag uitnodigen voor een gesprek.",
        context: "Ik denk dat het goed is om samen stil te staan bij hoe het gaat met [kind] bij [vak].",
        afsluiting: "Ik hoor graag wanneer het u uitkomt.",
      },
      "neutraal-zakelijk": {
        opening: "Ik nodig u uit voor een gesprek over de voortgang.",
        context: "Ik wil graag met u overleggen over [kind] bij [vak].",
        afsluiting: "Ik hoor graag welk moment u schikt.",
      },
      "duidelijk-formeel": {
        opening: "Ik nodig u uit voor een gesprek.",
        context: "Een gesprek over de voortgang van [kind] bij [vak] lijkt mij op zijn plaats.",
        afsluiting: "Ik verzoek u een moment door te geven waarop u beschikbaar bent.",
      },
    },
  },
  "Afspraak bevestigen": {
    subject: () => "Bevestiging van onze afspraak",
    observatieLabel: "Toelichting",
    actieLabel: "Ter bevestiging",
    tonen: {
      vriendelijk: {
        opening: "Even ter bevestiging van wat we hebben afgesproken.",
        context: "Fijn dat we samen naar [kind] bij [vak] hebben gekeken.",
        afsluiting: "Mocht er iets wijzigen, laat het gerust weten.",
      },
      "neutraal-zakelijk": {
        opening: "Hierbij bevestig ik de gemaakte afspraak.",
        context: "Dit gaat over [kind] bij [vak].",
        afsluiting: "Bij vragen hoor ik het graag.",
      },
      "duidelijk-formeel": {
        opening: "Ik bevestig hierbij de gemaakte afspraak.",
        context: "Dit betreft [kind] bij [vak].",
        afsluiting: "Ik ga ervan uit dat we deze afspraak beiden zo vasthouden.",
      },
    },
  },
  "Terugkoppeling na gesprek": {
    subject: () => "Terugkoppeling na ons gesprek",
    observatieLabel: "Wat we bespraken",
    actieLabel: "Afgesproken is",
    tonen: {
      vriendelijk: {
        opening: "Dank voor het fijne gesprek van laatst.",
        context: "Het was goed om samen over [kind] bij [vak] te praten.",
        afsluiting: "Ik hou u op de hoogte van hoe het gaat.",
      },
      "neutraal-zakelijk": {
        opening: "Bedankt voor het gesprek.",
        context: "Hierbij een korte terugkoppeling over [kind] bij [vak].",
        afsluiting: "Ik koppel op een later moment opnieuw terug.",
      },
      "duidelijk-formeel": {
        opening: "Dank voor het gevoerde gesprek.",
        context: "Hierbij bevestig ik de uitkomst van het gesprek over [kind] bij [vak].",
        afsluiting: "Ik blijf de voortgang volgen en informeer u hierover.",
      },
    },
  },
  "Materiaal vergeten structureel": {
    subject: (vak) =>
      heeftVak(vak) ? `Materiaal voor ${vak}: wat nodig is` : "Lesmateriaal: wat nodig is",
    observatieLabel: "Wat ik zie",
    actieLabel: "Mijn verzoek",
    tonen: {
      vriendelijk: {
        opening: "Ik wil u even laten weten dat [kind] regelmatig materiaal mist in de les.",
        context:
          "Bij [vak] heeft [kind] de afgelopen tijd vaker geen boek, schrift of rekenmachine bij zich.",
        afsluiting: "Vast met een kleine check thuis al op te lossen.",
      },
      "neutraal-zakelijk": {
        opening: "Ik informeer u dat [kind] structureel materiaal mist in de les.",
        context: "Voor [vak] ontbreekt bij [kind] regelmatig het benodigde materiaal.",
        afsluiting: "Graag zie ik dat dit structureel wordt opgelost.",
      },
      "duidelijk-formeel": {
        opening: "Ik informeer u dat [kind] herhaaldelijk zonder het benodigde materiaal verschijnt.",
        context: "Voor [vak] ontbreekt structureel het vereiste lesmateriaal.",
        afsluiting: "Ik verzoek u erop toe te zien dat dit vanaf nu op orde is.",
      },
    },
  },
  "Verbetering zichtbaar": {
    subject: (vak) => (heeftVak(vak) ? `Mooie vooruitgang bij ${vak}` : "Mooie vooruitgang"),
    observatieLabel: "Wat mij opviel",
    actieLabel: null,
    vasteVerzoek: "Deel dit gerust thuis.",
    tonen: {
      vriendelijk: {
        opening: "Ik zie mooie vooruitgang bij [kind].",
        context: "Bij [vak] gaat het duidelijk beter dan een tijdje terug.",
        afsluiting: "Complimenten, dit mag gezien worden.",
      },
      "neutraal-zakelijk": {
        opening: "Ik wil u laten weten dat [kind] vooruitgang boekt.",
        context: "Bij [vak] is een duidelijke verbetering zichtbaar ten opzichte van eerder.",
        afsluiting: "Dit is een positieve ontwikkeling.",
      },
      "duidelijk-formeel": {
        opening: "Ik meld u een zichtbare verbetering bij [kind].",
        context: "Bij [vak] is sprake van aantoonbare vooruitgang ten opzichte van de vorige periode.",
        afsluiting: "Deze ontwikkeling stemt mij positief.",
      },
    },
  },
  "Schoolreis / activiteit info": {
    subject: () => "Informatie over de schoolreis",
    observatieLabel: "Extra informatie",
    actieLabel: "Praktisch om te weten",
    tonen: {
      vriendelijk: {
        opening: "Graag geef ik u praktische informatie over de schoolreis.",
        context: "",
        afsluiting: "We kijken uit naar een fijne dag.",
      },
      "neutraal-zakelijk": {
        opening: "Hierbij de praktische informatie over de schoolreis.",
        context: "",
        afsluiting: "Bij vragen kunt u contact opnemen.",
      },
      "duidelijk-formeel": {
        opening: "Ik informeer u over de organisatie van de schoolreis.",
        context: "",
        afsluiting: "Deze informatie helpt bij een zorgvuldig verloop van de dag.",
      },
    },
  },
  "Reactie op boze mail (de-escalerend)": {
    subject: () => "Uw bericht: laten we het samen bekijken",
    observatieLabel: "Wat ik in mijn aantekeningen heb",
    actieLabel: "Mijn voorstel",
    tonen: {
      vriendelijk: {
        opening: "Dank voor uw bericht. Ik begrijp dat dit voor u vervelend voelt.",
        context: "Ik zet de feiten uit de les rustig op een rij, zodat we vanuit hetzelfde beeld verdergaan.",
        afsluiting: "Ik zoek graag samen met u naar een goede oplossing.",
      },
      "neutraal-zakelijk": {
        opening: "Dank voor uw bericht. Ik neem uw signaal serieus.",
        context: "Voor de duidelijkheid zet ik de situatie hieronder feitelijk op een rij.",
        afsluiting: "Zo kunnen we dit zorgvuldig met elkaar bespreken.",
      },
      "duidelijk-formeel": {
        opening: "Dank voor uw bericht. Ik neem dit signaal serieus en reageer graag zorgvuldig.",
        context: "Ik zet de beschikbare informatie hieronder neutraal en controleerbaar op een rij.",
        afsluiting: "Ik stel voor dit gezamenlijk tot een passende afronding te brengen.",
      },
    },
  },
};

export function maakOudermail(input: MailInput) {
  const kind = input.leerling.trim() || "uw kind";
  const vak = input.vak.trim() || "de les";
  const waarden = { kind, vak };
  const sjabloon = bank[input.aanleiding];
  const tekst = sjabloon.tonen[input.toon];

  const regels: string[] = [vul(tekst.opening, waarden)];

  if (input.aanleiding === "Schoolreis / activiteit info") {
    const datum = input.datum.trim();
    const locatie = input.locatie.trim();
    const tijd = input.tijd.trim();
    const meenemen = input.meenemen.trim();
    if (datum && locatie) regels.push(`We gaan op ${datum} naar ${locatie}.`);
    else if (datum) regels.push(`De schoolreis is op ${datum}.`);
    else if (locatie) regels.push(`De bestemming is ${locatie}.`);
    if (tijd) regels.push(`We vertrekken om ${tijd}.`);
    if (meenemen) regels.push(`Wilt u ${kind} ${meenemen} laten meenemen?`);
  } else if (tekst.context) {
    regels.push(vul(tekst.context, waarden));
  }

  if (sjabloon.observatieLabel) {
    const observatieZin = zinMet(sjabloon.observatieLabel, input.observatie);
    if (observatieZin) regels.push(observatieZin);
  }
  const observatie2Zin = zinMet("Daarnaast", input.observatie2);
  if (observatie2Zin) regels.push(observatie2Zin);

  if (sjabloon.vasteVerzoek) {
    regels.push(sjabloon.vasteVerzoek);
  } else if (sjabloon.actieLabel) {
    const actieZin = zinMet(sjabloon.actieLabel, input.actie);
    if (actieZin) regels.push(actieZin);
  }

  if (input.aanleiding === "Reactie op boze mail (de-escalerend)") {
    const belmomenten = input.belmomenten.trim();
    regels.push(
      belmomenten
        ? `Ik kan u bellen op ${belmomenten}.`
        : "Laat u mij weten wanneer het u uitkomt om te bellen of langs te komen?",
    );
  }

  regels.push(vul(tekst.afsluiting, waarden));

  const naam = input.naam.trim() || "De docent";
  const body = [
    `${input.aanhef.trim() || "Beste ouder(s)/verzorger(s)"},`,
    "",
    regels.filter(Boolean).join("\n\n"),
    "",
    "Met vriendelijke groet,",
    naam,
  ]
    .join("\n")
    .replace(/\.{2,}/g, ".");

  const subject = sjabloon.subject(vak, kind).replace(/\.{2,}/g, ".");

  return { subject, body };
}
export { bank as OUDERMAIL_PHRASE_BANK };
export { maakGespreksplanning, type GesprekInput } from "./gesprek";
export { maakVerslag, type VerslagInput } from "./verslag";
export { privacyOuders } from "./privacy";
