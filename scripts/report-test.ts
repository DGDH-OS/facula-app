import assert from "node:assert/strict";
import { controleerRapportKwaliteit } from "../src/lib/report-quality";
import { genereerRapportTekst } from "../src/lib/report-generator";
import type { ReportInput } from "../src/lib/types";

const input: ReportInput = { leerlingLabel: "Sanne", aantekeningen: "werkt zelfstandig, moeite met plannen", outputType: "rapporttekst", toon: "warm", periode: "rapport-1", niveau: "po", aanspreekvorm: "over-leerling", lengte: "normaal" };
const report = genereerRapportTekst(input);
assert.match(report.tekst, /Sanne/);
assert.match(report.tekst, /volgende periode|ontwikkeling|volgende stap/i);
assert.equal(controleerRapportKwaliteit(input, "Sanne is lui en heeft ADHD").ok, false);
assert.equal(controleerRapportKwaliteit(input, "werkt zelfstandig en helpt anderen").checks.some((check) => check.kind === "strength"), false);
console.log("report tests passed");
