export const AANLEIDINGEN = [
  "Huiswerk niet gemaakt", "Compliment / positief nieuws", "Afwezig bij toets / inhalen",
  "Gedrag in de les", "Zorgen over resultaten", "Uitnodiging gesprek", "Afspraak bevestigen",
  "Terugkoppeling na gesprek", "Materiaal vergeten structureel", "Verbetering zichtbaar",
  "Schoolreis / activiteit info", "Reactie op boze mail (de-escalerend)",
] as const;
export type Toon = "vriendelijk" | "neutraal-zakelijk" | "duidelijk-formeel";
export type Aanleiding = typeof AANLEIDINGEN[number];
export type MailInput = { aanleiding: Aanleiding; aanhef: string; leerling: string; vak: string; observatie: string; observatie2: string; actie: string; toon: Toon; lengte: "kort" | "normaal"; naam: string };
const onderwerp: Record<Aanleiding, string> = {
  "Huiswerk niet gemaakt": "Over het huiswerk voor {vak}", "Compliment / positief nieuws": "Positief nieuws over {kind}", "Afwezig bij toets / inhalen": "Afspraak voor het inhalen van de toets", "Gedrag in de les": "Korte terugkoppeling uit de les", "Zorgen over resultaten": "Samen kijken naar de voortgang", "Uitnodiging gesprek": "Uitnodiging voor een gesprek", "Afspraak bevestigen": "Bevestiging van onze afspraak", "Terugkoppeling na gesprek": "Terugkoppeling na ons gesprek", "Materiaal vergeten structureel": "Materiaal voor de les", "Verbetering zichtbaar": "Verbetering bij {kind}", "Schoolreis / activiteit info": "Informatie over de activiteit", "Reactie op boze mail (de-escalerend)": "Dank voor uw bericht",
};
export function maakOudermail(input: MailInput) {
  const kind = input.leerling.trim() ? input.leerling.trim() : "uw kind";
  const positief = input.aanleiding.includes("Compliment") || input.aanleiding.includes("Verbetering");
  const opening = positief ? `Fijn nieuws: ${input.observatie || "uw kind liet vandaag een mooie inzet zien"}.` : `Ik wil u kort informeren over ${input.observatie || "een observatie in de les"}.`;
  const extra = input.observatie2 ? ` Ook viel op: ${input.observatie2}.` : "";
  const action = input.actie || "Wilt u dit thuis kort bespreken?";
  const afsluiting = input.naam.trim() ? `Met vriendelijke groet,\n${input.naam.trim()}` : "Met vriendelijke groet,\nDe docent";
  const body = `${input.aanhef || "Beste ouder(s)/verzorger(s)"},\n\n${opening}${extra}\n\n${action}\n\nAls u wilt overleggen, hoor ik het graag.\n\n${afsluiting}`;
  const subject = onderwerp[input.aanleiding].replace("{vak}", input.vak || "de les").replace("{kind}", kind);
  return { subject, body };
}

export function privacyOuders(tekst: string) {
  const blokkeer: string[] = [];
  if (/\b(adhd|add|dyslexie|dyscalculie|autisme|diagnose|medicatie|depressie)\b/i.test(tekst)) blokkeer.push("medische of diagnose-termen");
  if (/(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+31|0)\s*\d(?:[\s-]*\d){8,})/i.test(tekst)) blokkeer.push("e-mailadres of telefoonnummer");
  const waarschuwing = /\b[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+\b/.test(tekst);
  return { blokkeer: blokkeer.length > 0, redenen: blokkeer, waarschuwing };
}

export type GesprekInput = { doel: string; sterk: string[]; aandacht: string[]; vraag: string; afspraak: string; minuten: 10 | 20 };
export function maakGespreksplanning(input: GesprekInput) {
  const tijden = input.minuten === 10 ? [1, 2, 2, 2, 2, 1] : [2, 4, 4, 4, 3, 3];
  const onderdelen = ["Opening", "Sterke punten", "Aandachtspunten", "Ouder aan het woord", "Afspraken", "Afsluiting"];
  return { tijden, tekst: onderdelen.map((naam, i) => `${tijden[i]} min - ${naam}`).join("\n") + `\n\nOpeningszin: Fijn dat we samen kijken naar ${input.doel || "de ontwikkeling van uw kind"}.\n\nSterk: ${input.sterk.filter(Boolean).join("; ") || "Noteer een concreet sterk punt."}\nAandacht: ${input.aandacht.filter(Boolean).join("; ") || "Noteer maximaal twee concrete aandachtspunten."}\nVraag aan ouder: ${input.vraag || "Wat herkent u thuis?"}\nAfspraak: ${input.afspraak || "Spreek één volgende stap en een moment van terugkijken af."}\n\nLSD: luister, vat samen en vraag door. Bij emotie: erken het gevoel, benoem de feiten en keer terug naar de gezamenlijke volgende stap.` };
}

export type VerslagInput = { datum: string; aanwezigen: string; besproken: string; afspraken: { wie: string; wat: string; wanneer: string }[]; vervolg: string };
export function maakVerslag(input: VerslagInput) {
  const afspraken = input.afspraken.filter((a) => a.wie || a.wat || a.wanneer).map((a) => `- ${a.wie || "Wie"}: ${a.wat || "Wat"} (${a.wanneer || "Wanneer"})`).join("\n") || "- Nog geen afspraken genoteerd";
  return `Verslag oudercontact\nDatum: ${input.datum || "nog invullen"}\nAanwezig: ${input.aanwezigen || "ouder/verzorger en docent"}\n\nBesproken\n${input.besproken || "Nog invullen"}\n\nAfspraken\n${afspraken}\n\nVervolg\n${input.vervolg || "Nog invullen"}`;
}
