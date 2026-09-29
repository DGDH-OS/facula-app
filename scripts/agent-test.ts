import assert from "node:assert/strict";
import { voerAssistentUit, WORKFLOWS, workflowById } from "../src/lib/agent";

const BESTAANDE_HREFS = new Set(WORKFLOWS.map((w) => w.href));

function klaar(vraag: string, velden: Record<string, string> = {}, gekozen?: Parameters<typeof voerAssistentUit>[2]) {
  const uit = voerAssistentUit(vraag, velden, gekozen);
  assert.equal(uit.soort, "klaar");
  if (uit.soort !== "klaar") throw new Error("verwacht klaar");
  return uit;
}

const onbekend = voerAssistentUit("boek een vliegticket naar Rome");
assert.equal(onbekend.soort, "geweigerd");
if (onbekend.soort === "geweigerd") assert.equal(onbekend.code, "onbekend");

const leeg = voerAssistentUit("   ");
assert.equal(leeg.soort, "geweigerd");
if (leeg.soort === "geweigerd") assert.equal(leeg.code, "onbekend");

const piiMail = voerAssistentUit("maak een les voor jan@school.nl");
assert.equal(piiMail.soort, "geweigerd");
if (piiMail.soort === "geweigerd") assert.equal(piiMail.code, "pii");

const piiTel = voerAssistentUit("toets voor 0612345678");
assert.equal(piiTel.soort, "geweigerd");
if (piiTel.soort === "geweigerd") assert.equal(piiTel.code, "pii");

const piiMedisch = voerAssistentUit("maak een rapport over adhd");
assert.equal(piiMedisch.soort, "geweigerd");
if (piiMedisch.soort === "geweigerd") assert.equal(piiMedisch.code, "pii");

const piiNaam = voerAssistentUit("les voor Jan Jansen over de EU");
assert.equal(piiNaam.soort, "geweigerd");
if (piiNaam.soort === "geweigerd") assert.equal(piiNaam.code, "pii");

const piiVeld = voerAssistentUit("maak een les", {
  leerdoel: "Mail naar ouder@school.nl",
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "4",
});
assert.equal(piiVeld.soort, "geweigerd");
if (piiVeld.soort === "geweigerd") assert.equal(piiVeld.code, "pii");

const cijfer = voerAssistentUit("geef een cijfer voor deze toets");
assert.equal(cijfer.soort, "geweigerd");
if (cijfer.soort === "geweigerd") assert.equal(cijfer.code, "beoordeling");

const overgang = voerAssistentUit("moet deze klas blijven zitten");
assert.equal(overgang.soort, "geweigerd");
if (overgang.soort === "geweigerd") assert.equal(overgang.code, "overgang");

const zakken = voerAssistentUit("advies of hij gaat zakken");
assert.equal(zakken.soort, "geweigerd");
if (zakken.soort === "geweigerd") assert.equal(zakken.code, "overgang");

const leerlinggericht = voerAssistentUit("maak een les voor leerlingen om zelf te maken");
assert.equal(leerlinggericht.soort, "geweigerd");
if (leerlinggericht.soort === "geweigerd") {
  assert.equal(leerlinggericht.code, "leerlinggericht");
}

const ontbreekt = voerAssistentUit("maak een les over de industriële revolutie");
assert.equal(ontbreekt.soort, "vragen");
if (ontbreekt.soort === "vragen") {
  assert.equal(ontbreekt.workflowId, "les");
  assert.ok(ontbreekt.ontbrekendeVelden.includes("vak"));
  assert.ok(ontbreekt.ontbrekendeVelden.includes("niveau"));
  assert.ok(ontbreekt.ontbrekendeVelden.includes("leerjaar"));
  assert.ok(ontbreekt.ontbrekendeVelden.includes("leerdoel"));
  assert.equal(ontbreekt.ontbrekendeVelden.includes("leerling"), false);
}

const geenDefault = voerAssistentUit("les", { niveau: "havo", leerjaar: "4", leerdoel: "De EU uitleggen" });
assert.equal(geenDefault.soort, "vragen");
if (geenDefault.soort === "vragen") {
  assert.ok(geenDefault.ontbrekendeVelden.includes("vak"));
  assert.equal(geenDefault.melding.includes("Maatschappijleer"), false);
}

const ongeldigVak = voerAssistentUit("les", {
  vak: "Wiskunde",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "De EU uitleggen",
});
assert.equal(ongeldigVak.soort, "vragen");
if (ongeldigVak.soort === "vragen") {
  assert.ok(ongeldigVak.ongeldigeVelden.some((f) => f.id === "vak"));
}

const ongeldigJaar = voerAssistentUit("les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "9",
  leerdoel: "De EU uitleggen",
});
assert.equal(ongeldigJaar.soort, "vragen");

const les = klaar("maak een les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "De industriële revolutie uitleggen",
});
assert.equal(les.workflowId, "les");
assert.equal(les.menselijkeControle, true);
assert.equal(les.volgendeStap.href, "/app/lessons/new");
assert.equal(les.volgendeStap.href.includes("?"), false);
assert.equal(les.ingevuldeVelden.vak, "Geschiedenis");
assert.equal(les.ingevuldeVelden.leerdoel.includes("Jan"), false);
assert.ok(BESTAANDE_HREFS.has(les.volgendeStap.href));

const toets = klaar("ik wil een toets maken", {
  vak: "Economie",
  niveau: "vwo",
  leerjaar: "5",
  leerdoel: "Vraag en aanbod",
});
assert.equal(toets.workflowId, "toets");
assert.equal(toets.volgendeStap.href, "/app/tests/new");

const toetsweek = klaar("plan de toetsweek");
assert.equal(toetsweek.workflowId, "toetsweek");
assert.equal(toetsweek.volgendeStap.href, "/app/toetsweek");
assert.equal(toetsweek.menselijkeControle, true);

const rapport = klaar("schrijf een rapporttekst", { outputType: "rapporttekst" });
assert.equal(rapport.workflowId, "rapport");
assert.equal(rapport.volgendeStap.href, "/app/reports/new");
assert.equal("leerlingLabel" in rapport.ingevuldeVelden, false);
assert.ok(rapport.waarschuwingen.some((w) => w.toLowerCase().includes("initialen")));

const oudermail = klaar("een oudermail voorbereiden");
assert.equal(oudermail.workflowId, "oudermail");
assert.equal(oudermail.volgendeStap.href, "/app/ouders");

const gesprek = klaar("help met een oudergesprek");
assert.equal(gesprek.workflowId, "oudergesprek");
assert.equal(gesprek.volgendeStap.href, "/app/ouders");

const coach = klaar("vraag aan de coach over vakdidactiek");
assert.equal(coach.workflowId, "coach");
assert.equal(coach.volgendeStap.href, "/app/coach");

const nakijken = klaar("nakijken van de stapel plannen");
assert.equal(nakijken.workflowId, "nakijken");
assert.equal(nakijken.volgendeStap.href, "/app/nakijken");

const viaKaart = voerAssistentUit("", {}, "les");
assert.equal(viaKaart.soort, "vragen");

const viaKaartVelden = klaar("", {
  vak: "Aardrijkskunde",
  niveau: "vmbo-t",
  leerjaar: "3",
  leerdoel: "Verstedelijking",
}, "les");
assert.equal(viaKaartVelden.workflowId, "les");

for (const w of WORKFLOWS) {
  assert.equal(workflowById(w.id).href.startsWith("/app/"), true);
  assert.equal(w.href.includes("naam="), false);
  assert.equal(w.velden.some((v) => /naam|leerling|email|telefoon|diagnose/i.test(v.id)), false);
}

console.log("agent-test: alle checks geslaagd");
