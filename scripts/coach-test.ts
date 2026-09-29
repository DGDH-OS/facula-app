import assert from "node:assert/strict";
import { KENNISBANK } from "../src/lib/coach/kennisbank";
import { controleerCoachPii, matchCoachVraag, zoekUrls } from "../src/lib/coach/matcher";
import { maakWeekplan } from "../src/lib/coach/werkdruk";

const vragen: Array<[string, string]> = [
  ["hoe schrijf ik een rapporttekst", "rapport-structuur"], ["werkpunte in rapport", "rapport-werkpunt"], ["ouder gesprek voorbereiden", "oudergesprek"], ["10 minuten gesprek", "tien-minuten"], ["lastige boodschap aan ouders", "lastige-boodschap"], ["hoe differentieer ik", "differentiatie"], ["3 nivo's", "differentiatie-3"], ["les opbouw", "lesopbouw"], ["EDI uitleg", "edi"], ["toets matries", "toetsmatrijs"], ["Bloom in toets", "bloom"], ["sneller nakijken", "nakijken"], ["formatief handelen", "formatief"], ["rust in klas", "klassenmanagement"], ["minder werkdruk", "werkdruk"],
];
for (const [vraag, id] of vragen) assert.equal(matchCoachVraag(vraag).entry?.id, id, `${vraag} matchte niet`);
assert.equal(matchCoachVraag("qzxv blorp 999").entry, null);
assert.equal(controleerCoachPii("mail me op docent@example.nl").bevatPii, true);
assert.equal(controleerCoachPii("bel 06-1234-5678").bevatPii, true);
assert.equal(controleerCoachPii("de diagnose ADHD bespreken").bevatPii, true);
assert.equal(controleerCoachPii("Jan Jansen maakt een toets").bevatPii, true);
for (const url of zoekUrls("Mail Jan Jansen op jan@example.nl of 06-1234-5678 over ADHD")) { const u = new URL(url); assert.ok(["www.kennisnet.nl", "www.slo.nl", "www.rijksoverheid.nl", "www.onderwijsinspectie.nl", "duckduckgo.com"].includes(u.hostname)); assert.ok(!url.includes("jan%40example.nl") && !url.includes("1234")); }
assert.deepEqual(maakWeekplan(["mails", "mails"]), ["Kies per dag één hoofdtaak en houd een leeg blok voor onverwachte zaken.", "Mails: plan twee antwoordmomenten en zet een stoptijd."]);
for (const entry of KENNISBANK) { for (const actie of entry.acties ?? []) assert.ok(actie.href.startsWith("/app")); for (const bron of entry.bronnen ?? []) assert.ok(["rijksoverheid.nl", "www.rijksoverheid.nl", "onderwijsinspectie.nl", "www.onderwijsinspectie.nl", "kennisnet.nl", "www.kennisnet.nl", "slo.nl", "www.slo.nl"].includes(new URL(bron.url).hostname)); }
console.log(`coach tests ok (${vragen.length} matches, ${KENNISBANK.length} kennisbank-items)`);
