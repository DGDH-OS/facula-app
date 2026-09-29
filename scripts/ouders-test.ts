import {
  AANLEIDINGEN,
  maakGespreksplanning,
  maakOudermail,
  maakVerslag,
  privacyOuders,
} from "../src/lib/ouders/templates";
const tonen = [
  "vriendelijk",
  "neutraal-zakelijk",
  "duidelijk-formeel",
] as const;
const bodies = new Set<string>();
for (const aanleiding of AANLEIDINGEN)
  for (const toon of tonen) {
    const mail = maakOudermail({
      aanleiding,
      aanhef: "Beste ouder(s)/verzorger(s)",
      leerling: "L.J.",
      vak: "Nederlands",
      observatie: "de opdracht is gestart",
      observatie2: "de uitleg is gevolgd",
      actie: "Wilt u dit thuis bespreken?",
      toon,
      lengte: "kort",
      naam: "De docent",
    });
    if (
      !mail.subject ||
      !mail.body ||
      /undefined|\{\{|—/.test(`${mail.subject} ${mail.body}`) ||
      mail.body.split(/\s+/).length > 120
    )
      throw new Error(`Ongeldige template ${aanleiding}/${toon}`);
    bodies.add(mail.body);
    if (/^Wilt u dit thuis bespreken\??$/m.test(mail.body))
      throw new Error("Actie staat los");
    if (
      aanleiding.includes("boze") &&
      /\b(maar|u moet|schuld)\b/i.test(mail.body)
    )
      throw new Error("De-escalatie faalt");
    if (
      aanleiding.includes("Compliment") &&
      /\bwilt u\b|\bmoet\b/i.test(mail.body)
    )
      throw new Error("Compliment vraagt iets");
  }
if (bodies.size !== AANLEIDINGEN.length * tonen.length)
  throw new Error("Bodies zijn niet uniek");
const planning = maakGespreksplanning({
  doel: "de voortgang",
  sterk: ["inzet"],
  aandacht: ["planning"],
  vraag: "Wat herkent u?",
  afspraak: "volgende week terugkijken",
  minuten: 10,
});
if (planning.tijden.reduce((a, b) => a + b, 0) !== 10)
  throw new Error("Timing klopt niet");
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
