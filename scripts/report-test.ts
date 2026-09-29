import assert from "node:assert/strict";
import { controleerRapportKwaliteit } from "../src/lib/report-quality";
import { genereerRapportTekst } from "../src/lib/report-generator";
import type { ReportInput } from "../src/lib/types";
import { normaliseerRapportGuardrail, rapportExportGeblokkeerd } from "../src/lib/report-compat";

assert.deepEqual(normaliseerRapportGuardrail(undefined), { ok: true, gevondenWoorden: [] });
assert.deepEqual(normaliseerRapportGuardrail({ ok: false, gevondenWoorden: ["cijfer", 1] }), { ok: false, gevondenWoorden: ["cijfer"] });
assert.equal(rapportExportGeblokkeerd(true, [true, true]), false);
assert.equal(rapportExportGeblokkeerd(false, [true, true]), true);
assert.equal(rapportExportGeblokkeerd(true, [true, false]), true);

const input: ReportInput = { leerlingLabel: "Sanne", aantekeningen: "werkt zelfstandig, moeite met plannen", outputType: "rapporttekst", toon: "warm", periode: "rapport-1", niveau: "po", aanspreekvorm: "over-leerling", lengte: "normaal" };
const report = genereerRapportTekst(input);
assert.match(report.tekst, /Sanne/);
assert.match(report.tekst, /volgende periode|ontwikkeling|volgende stap/i);
assert.equal(controleerRapportKwaliteit(input, "Sanne is lui en heeft ADHD").ok, false);
assert.equal(controleerRapportKwaliteit(input, "werkt zelfstandig en helpt anderen").checks.some((check) => check.kind === "strength"), false);
console.log("report tests passed");

const structuredInput: ReportInput = {
  leerlingLabel: "L.J.",
  aantekeningen: "werkt zelfstandig, helpt klasgenoten, moeite met plannen van huiswerk",
  waargenomenSterkte: "werkt zelfstandig",
  aandachtspunt: "plannen van huiswerk",
  voorbeeldBewijs: "leverde het werkstuk op tijd in",
  vervolgstapInDeKlas: "samen een weekplanning maken",
  outputType: "rapporttekst",
  toon: "warm",
};
const structured = genereerRapportTekst(structuredInput).tekst;
assert.doesNotMatch(structured, /\bdat (werkt|moeite|helpt|heeft|is)\b/i);
const zinnen = structured.replace(/L\.J\./g, "LJ").split(/(?<=[.!?])\s+(?=[A-Z])/).map((zin) => zin.trim()).filter(Boolean);
assert.equal(new Set(zinnen).size, zinnen.length);
assert.match(structured, /Wat goed gaat bij L\.J\.: werkt zelfstandig en helpt klasgenoten\./);
assert.match(structured, /Aandachtspunt: plannen van huiswerk\./);
assert.doesNotMatch(structured, /Verder is genoteerd:.*werkt zelfstandig/i);

const gesprek = genereerRapportTekst({ ...structuredInput, outputType: "oudergesprek" }).tekst;
assert.ok(gesprek.split("\n").length >= 5);
assert.match(gesprek, /• Voorbeeld: leverde het werkstuk op tijd in/);
