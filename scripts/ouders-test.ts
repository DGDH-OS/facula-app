import {
  AANLEIDINGEN,
  maakGespreksplanning,
  maakOudermail,
  maakVerslag,
  privacyOuders,
  type MailInput,
} from "../src/lib/ouders/templates";
const tonen = [
  "vriendelijk",
  "neutraal-zakelijk",
  "duidelijk-formeel",
] as const;
const basis: Omit<MailInput, "aanleiding" | "toon" | "observatie" | "actie"> = {
  aanhef: "Beste ouder(s)/verzorger(s)",
  leerling: "L.J.",
  vak: "Nederlands",
  observatie2: "",
  lengte: "kort",
  naam: "De docent",
  datum: "",
  locatie: "",
  tijd: "",
  meenemen: "",
  belmomenten: "",
};
function zonderOpening(body: string): string {
  return body.split("\n").slice(2).join("\n");
}
function bevatGap(tekst: string): boolean {
  return /  | ;| \.|\.\.| ,/.test(tekst);
}

// 1. Elke aanleiding x toon met LEGE observatie/actie: unieke inhoud na aanhef+opening.
for (const toon of tonen) {
  const lichamen = new Set<string>();
  for (const aanleiding of AANLEIDINGEN) {
    const mail = maakOudermail({
      ...basis,
      aanleiding,
      toon,
      observatie: "",
      actie: "",
    });
    if (!mail.subject || !mail.body || /undefined|\{\{|—/.test(`${mail.subject} ${mail.body}`))
      throw new Error(`Ongeldige template ${aanleiding}/${toon}`);
    if (mail.body.includes(".."))
      throw new Error(`Dubbele punt in ${aanleiding}/${toon}`);
    if (bevatGap(mail.body))
      throw new Error(`Gat in de tekst bij ${aanleiding}/${toon}`);
    if (!/^[A-ZÀ-ÖØ-Ý]/.test(mail.subject))
      throw new Error(`Onderwerp begint niet met hoofdletter: ${aanleiding}/${toon}`);
    const rest = zonderOpening(mail.body);
    if (lichamen.has(rest))
      throw new Error(`Sjabloon is niet uniek voor ${aanleiding}/${toon}`);
    lichamen.add(rest);
  }
  if (lichamen.size !== AANLEIDINGEN.length)
    throw new Error(`Niet alle sjablonen zijn uniek voor toon ${toon}`);
}

// 2. Gevulde mails: geen "hoe [actie]"/"dat [actie]", geen dubbele punten/gaten.
const acties = [
  "een vaste huiswerktijd afspreken",
  "morgen even een boek meenemen",
];
for (const aanleiding of AANLEIDINGEN)
  for (const toon of tonen)
    for (const actie of acties) {
      const mail = maakOudermail({
        ...basis,
        aanleiding,
        toon,
        observatie: "de opdracht is gestart",
        actie,
      });
      if (mail.body.includes(".."))
        throw new Error(`Dubbele punt (gevuld) bij ${aanleiding}/${toon}`);
      if (bevatGap(mail.body))
        throw new Error(`Gat in de tekst (gevuld) bij ${aanleiding}/${toon}`);
      if (mail.body.includes(`hoe ${actie}`))
        throw new Error(`Actie staat achter 'hoe' bij ${aanleiding}/${toon}`);
      if (mail.body.includes(`dat ${actie}`))
        throw new Error(`Actie staat achter 'dat' bij ${aanleiding}/${toon}`);
    }

// 3. Boze mail: geen "maar"/"u moet"/schuld, geen weekdagen zonder belmomenten.
const weekdagen = /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/i;
for (const toon of tonen) {
  const zonderBel = maakOudermail({
    ...basis,
    aanleiding: "Reactie op boze mail (de-escalerend)",
    toon,
    observatie: "de opdracht is gestart",
    actie: "hier samen naar te kijken",
  });
  if (/\b(maar|u moet|schuld)\b/i.test(zonderBel.body))
    throw new Error("De-escalatie faalt (verboden woord)");
  if (weekdagen.test(zonderBel.body))
    throw new Error("Boze mail zonder belmomenten bevat toch een weekdag");
  const metBel = maakOudermail({
    ...basis,
    aanleiding: "Reactie op boze mail (de-escalerend)",
    toon,
    observatie: "de opdracht is gestart",
    actie: "hier samen naar te kijken",
    belmomenten: "dinsdag om 15.30 uur",
  });
  if (!metBel.body.includes("dinsdag om 15.30 uur"))
    throw new Error("Belmomenten worden niet gebruikt");
}

// 4. Compliment/verbetering: geen verzoek, geen negatieve observatie2 tenzij gegeven.
for (const aanleiding of [
  "Compliment / positief nieuws",
  "Verbetering zichtbaar",
] as const)
  for (const toon of tonen) {
    const zonder = maakOudermail({
      ...basis,
      aanleiding,
      toon,
      observatie: "de uitleg is gevolgd",
      actie: "dit thuis bespreken",
    });
    if (/\bwilt u\b|\bmoet\b/i.test(zonder.body))
      throw new Error(`Compliment/verbetering vraagt iets bij ${aanleiding}/${toon}`);
    if (!zonder.body.includes("Deel dit gerust thuis"))
      throw new Error(`Vaste verzoekzin ontbreekt bij ${aanleiding}/${toon}`);
    if (/nog aandacht vraagt|nog niet zichtbaar|aanpak nog/.test(zonder.body))
      throw new Error(`Negatieve observatie2 ongevraagd aanwezig bij ${aanleiding}/${toon}`);
    const metPositief = maakOudermail({
      ...basis,
      aanleiding,
      toon,
      observatie: "de uitleg is gevolgd",
      observatie2: "de inzet groeit",
      actie: "",
    });
    if (!/de inzet groeit/i.test(metPositief.body))
      throw new Error(`Gegeven observatie2 verdwijnt bij ${aanleiding}/${toon}`);
  }

// 5. Schoolreis met velden bevat datum en locatie; zonder velden geen gaten.
for (const toon of tonen) {
  const metVelden = maakOudermail({
    ...basis,
    aanleiding: "Schoolreis / activiteit info",
    toon,
    observatie: "",
    actie: "",
    datum: "12 oktober",
    locatie: "Museon Den Haag",
    tijd: "08.30 uur",
    meenemen: "een lunchpakket",
  });
  if (!metVelden.body.includes("12 oktober") || !metVelden.body.includes("Museon Den Haag"))
    throw new Error("Schoolreisvelden ontbreken in de tekst");
  const zonderVelden = maakOudermail({
    ...basis,
    aanleiding: "Schoolreis / activiteit info",
    toon,
    observatie: "",
    actie: "",
  });
  if (bevatGap(zonderVelden.body))
    throw new Error("Schoolreis zonder velden laat een gat achter");
}

// 6. Initialen-dubbele-punt: "L.J.." mag niet voorkomen.
const initialenMail = maakOudermail({
  ...basis,
  aanleiding: "Compliment / positief nieuws",
  toon: "vriendelijk",
  observatie: "de opdracht is gestart",
  actie: "",
});
if (initialenMail.body.includes("L.J.."))
  throw new Error("Dubbele punt na initialen");

// Gespreksplanning
const planning = maakGespreksplanning({
  doel: "de voortgang",
  sterk: ["inzet"],
  aandacht: ["planning"],
  vraag: "wat herkent u?",
  afspraak: "volgende week terugkijken",
  minuten: 10,
});
if (planning.tijden.reduce((a, b) => a + b, 0) !== 10)
  throw new Error("Timing klopt niet");
if (!planning.tekst.includes("Wat herkent u?"))
  throw new Error("Doorvraag is niet met hoofdletter geschreven");
if (!planning.tekst.includes("Volgende week terugkijken"))
  throw new Error("Afspraak is niet met hoofdletter geschreven");
const planning20 = maakGespreksplanning({
  doel: "de voortgang",
  sterk: [],
  aandacht: [],
  vraag: "",
  afspraak: "",
  minuten: 20,
});
if (
  planning20.tijden.reduce((a, b) => a + b, 0) !== 20 ||
  planning20.tekst === planning.tekst
)
  throw new Error("20-minutenplanning klopt niet");
const verslag = maakVerslag({
  datum: "1-1-2026",
  aanwezigen: "ouder en docent",
  besproken: "de voortgang",
  afspraken: [{ wie: "docent", wat: "mailt", wanneer: "vrijdag" }],
  vervolg: "vrijdag",
});
if (!verslag.includes("docent: mailt (vrijdag)"))
  throw new Error("Afspraken ontbreken");
if (
  !privacyOuders("ADHD").blokkeer ||
  !privacyOuders("test@example.com").blokkeer ||
  !privacyOuders("06 12345678").blokkeer
)
  throw new Error("Privacyblokkade ontbreekt");
const url = [
  "mailto:?subject=",
  encodeURIComponent("Onderwerp"),
  "&body=",
  encodeURIComponent("Tekst met spatie"),
].join("");
if (!url.includes("%20")) throw new Error("Mailto encoding ontbreekt");
console.log("ouders-tests: ok");
