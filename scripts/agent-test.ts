import assert from "node:assert/strict";
import {
  voerAssistentUit,
  voerBevestigdeActieUit,
  WORKFLOWS,
  workflowById,
} from "../src/lib/agent";
import type { WorkflowId } from "../src/lib/agent/types";

const BESTAANDE_HREFS = new Set(WORKFLOWS.map((w) => w.href));

function klaar(
  gekozen: WorkflowId,
  velden: Record<string, string> = {},
) {
  const uit = voerAssistentUit(gekozen, velden);
  assert.equal(uit.soort, "klaar");
  if (uit.soort !== "klaar") throw new Error("verwacht klaar");
  assert.equal(uit.requiresConfirmation, true);
  assert.equal("href" in uit, false);
  return uit;
}

const leeg = voerAssistentUit();
assert.equal(leeg.soort, "geweigerd");
if (leeg.soort === "geweigerd") assert.equal(leeg.code, "onbekend");

const onbekendId = voerAssistentUit(
  "niet-bestaand" as unknown as WorkflowId,
);
assert.equal(onbekendId.soort, "geweigerd");
if (onbekendId.soort === "geweigerd") {
  assert.equal(onbekendId.code, "onbekend");
}
assert.equal(workflowById("niet-bestaand"), undefined);
assert.equal(workflowById(undefined), undefined);

const extraNaam = voerAssistentUit("les", { naam: "Jan" });
assert.equal(extraNaam.soort, "geweigerd");
if (extraNaam.soort === "geweigerd") {
  assert.equal(extraNaam.code, "ongeldig-veld");
}

const extraMail = voerAssistentUit("les", { email: "a@b.nl" });
assert.equal(extraMail.soort, "geweigerd");

const vrijTekst = voerAssistentUit("les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "vrije tekst over Jan",
});
assert.equal(vrijTekst.soort, "vragen");
if (vrijTekst.soort === "vragen") {
  assert.ok(vrijTekst.ongeldigeVelden.some((f) => f.id === "leerdoel"));
}

const ontbreekt = voerAssistentUit("les");
assert.equal(ontbreekt.soort, "vragen");
if (ontbreekt.soort === "vragen") {
  assert.equal(ontbreekt.workflowId, "les");
  assert.ok(ontbreekt.ontbrekendeVelden.includes("vak"));
  assert.ok(ontbreekt.ontbrekendeVelden.includes("niveau"));
  assert.ok(ontbreekt.ontbrekendeVelden.includes("leerjaar"));
  assert.ok(ontbreekt.ontbrekendeVelden.includes("leerdoel"));
  assert.equal(ontbreekt.ontbrekendeVelden.includes("leerling"), false);
}

const geenDefault = voerAssistentUit("les", {
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "eu",
});
assert.equal(geenDefault.soort, "vragen");
if (geenDefault.soort === "vragen") {
  assert.ok(geenDefault.ontbrekendeVelden.includes("vak"));
  assert.equal(geenDefault.melding.includes("Maatschappijleer"), false);
}

const ongeldigVak = voerAssistentUit("les", {
  vak: "Wiskunde",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "eu",
});
assert.equal(ongeldigVak.soort, "vragen");
if (ongeldigVak.soort === "vragen") {
  assert.ok(ongeldigVak.ongeldigeVelden.some((f) => f.id === "vak"));
}

const ongeldigJaar = voerAssistentUit("les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "9",
  leerdoel: "eu",
});
assert.equal(ongeldigJaar.soort, "vragen");

const les = klaar("les", {
  vak: "Geschiedenis",
  niveau: "havo",
  leerjaar: "4",
  leerdoel: "industrie",
});
assert.equal(les.workflowId, "les");
assert.equal(les.menselijkeControle, true);
assert.equal(les.ingevuldeVelden.vak, "Geschiedenis");
assert.equal(les.ingevuldeVelden.leerdoel.includes("Jan"), false);

const zonderBevestiging = voerBevestigdeActieUit(les, false);
assert.equal(zonderBevestiging.soort, "geweigerd");
if (zonderBevestiging.soort === "geweigerd") {
  assert.equal(zonderBevestiging.code, "geen-bevestiging");
}

const lesActie = voerBevestigdeActieUit(les, true);
assert.equal(lesActie.soort, "actie");
if (lesActie.soort !== "actie") throw new Error("verwacht actie");
assert.equal(lesActie.href, "/app/lessons/new");
assert.equal(lesActie.href.includes("?"), false);
assert.ok(BESTAANDE_HREFS.has(lesActie.href));
assert.equal("send" in lesActie, false);
assert.equal("save" in lesActie, false);
assert.equal("export" in lesActie, false);
assert.equal("print" in lesActie, false);
assert.equal("grade" in lesActie, false);

const toets = klaar("toets", {
  vak: "Economie",
  niveau: "vwo",
  leerjaar: "5",
  leerdoel: "vraag-aanbod",
});
assert.equal(toets.workflowId, "toets");
const toetsActie = voerBevestigdeActieUit(toets, true);
assert.equal(toetsActie.soort, "actie");
if (toetsActie.soort === "actie") {
  assert.equal(toetsActie.href, "/app/tests/new");
}

const toetsweek = klaar("toetsweek");
assert.equal(toetsweek.workflowId, "toetsweek");
assert.equal(toetsweek.menselijkeControle, true);
const twActie = voerBevestigdeActieUit(toetsweek, true);
assert.equal(twActie.soort, "actie");
if (twActie.soort === "actie") {
  assert.equal(twActie.href, "/app/toetsweek");
}

const rapport = klaar("rapport", { outputType: "rapporttekst" });
assert.equal(rapport.workflowId, "rapport");
assert.equal("leerlingLabel" in rapport.ingevuldeVelden, false);
assert.equal(
  rapport.checklist.join(" ").toLowerCase().includes("initialen"),
  false,
);
const rapportActie = voerBevestigdeActieUit(rapport, true);
assert.equal(rapportActie.soort, "actie");
if (rapportActie.soort === "actie") {
  assert.equal(rapportActie.href, "/app/reports/new");
}

const oudermail = klaar("oudermail");
assert.equal(oudermail.workflowId, "oudermail");
const mailActie = voerBevestigdeActieUit(oudermail, true);
assert.equal(mailActie.soort, "actie");
if (mailActie.soort === "actie") {
  assert.equal(mailActie.href, "/app/ouders");
}

const gesprek = klaar("oudergesprek");
assert.equal(gesprek.workflowId, "oudergesprek");

const coach = klaar("coach");
assert.equal(coach.workflowId, "coach");
const coachActie = voerBevestigdeActieUit(coach, true);
assert.equal(coachActie.soort, "actie");
if (coachActie.soort === "actie") {
  assert.equal(coachActie.href, "/app/coach");
}

const nakijken = klaar("nakijken");
assert.equal(nakijken.workflowId, "nakijken");
const nakActie = voerBevestigdeActieUit(nakijken, true);
assert.equal(nakActie.soort === "actie" && nakActie.href, "/app/nakijken");

for (const w of WORKFLOWS) {
  const def = workflowById(w.id);
  assert.ok(def);
  assert.equal(def.href.startsWith("/app/"), true);
  assert.equal(w.href.includes("naam="), false);
  assert.equal(
    w.velden.some((v) => /naam|leerling|email|telefoon|diagnose/i.test(v.id)),
    false,
  );
  assert.equal(
    w.velden.every((v) => v.soort === "keuze" && v.keuzes.length > 0),
    true,
  );
  const voorstel = voerAssistentUit(w.id, {});
  if (voorstel.soort === "klaar") {
    const geweigerd = voerBevestigdeActieUit(voorstel, false);
    assert.equal(geweigerd.soort, "geweigerd");
    const actie = voerBevestigdeActieUit(voorstel, true);
    assert.equal(actie.soort, "actie");
  }
}

console.log("agent-test: alle checks geslaagd");
