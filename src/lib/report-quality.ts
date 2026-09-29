import type { ReportInput } from "./types";

export type ReportQualityKind = "label" | "privacy" | "strength" | "workpoints" | "growth" | "name" | "length";
export interface ReportQualityCheck { kind: ReportQualityKind; niveau: "waarschuwing" | "tip"; melding: string; }
export interface ReportQualityResult { ok: boolean; checks: ReportQualityCheck[]; }

const LABELS: Record<string, string> = { lui: "heeft soms een zetje nodig", dom: "kan dit nog oefenen", slecht: "kan hierin groeien", ongemotiveerd: "heeft hulp nodig om te starten" };
const MEDISCH = /\b(adhd|add|dyslexie|dyscalculie|autisme|autistisch|hoogbegaafd|depressie|diagnose|medicatie)\b/gi;
const POSITIEF = /\b(goed|sterk|groei|vooruitgang|zelfstandig|actief|helpt|werkt|kan|talent|succes|fijn|betrokken|nieuwsgierig|samenwerken)\b/i;
const GROEI = /\b(kan oefenen|volgende stap|gaat oefenen|blijven oefenen|probeer|helpt om|werkpunt|groeien|ontwikkelen)\b/i;

export function controleerRapportKwaliteit(input: ReportInput, tekst = input.aantekeningen): ReportQualityResult {
  const checks: ReportQualityCheck[] = [];
  Object.entries(LABELS).forEach(([woord, alternatief]) => {
    if (new RegExp(`\\b${woord}\\b`, "i").test(tekst)) checks.push({ kind: "label", niveau: "waarschuwing", melding: `Vermijd '${woord}'. Suggestie: ${alternatief}.` });
  });
  const medische = [...new Set(tekst.toLowerCase().match(MEDISCH) ?? [])];
  if (medische.length) checks.push({ kind: "privacy", niveau: "waarschuwing", melding: `Let op: ${medische.join(", ")} zijn bijzondere persoonsgegevens. Laat deze termen weg.` });
  if (!POSITIEF.test(tekst)) checks.push({ kind: "strength", niveau: "waarschuwing", melding: "Voeg minstens één concrete kracht toe." });
  const werkpunten = (tekst.toLowerCase().match(/werkpunt|aandachtspunt|moeite met|kan nog|volgende stap/g) ?? []).length;
  if (werkpunten > 2) checks.push({ kind: "workpoints", niveau: "waarschuwing", melding: "Beperk het aantal werkpunten tot maximaal twee." });
  if (werkpunten > 0 && !GROEI.test(tekst)) checks.push({ kind: "growth", niveau: "tip", melding: "Formuleer een werkpunt als volgende stap, met een concrete tip." });
  if (input.leerlingLabel.trim().split(/\s+/).length > 2) checks.push({ kind: "name", niveau: "waarschuwing", melding: "Gebruik alleen een voornaam of initialen, geen volledige naam." });
  const lengte = input.lengte ?? "normaal";
  const min = lengte === "kort" ? 180 : lengte === "uitgebreid" ? 450 : 280;
  const max = lengte === "kort" ? 700 : lengte === "uitgebreid" ? 1800 : 1200;
  if (tekst.length < min || tekst.length > max) checks.push({ kind: "length", niveau: "tip", melding: `De tekst past niet goed bij de gekozen lengte (${min}-${max} tekens).` });
  return { ok: checks.every((check) => check.niveau !== "waarschuwing"), checks };
}

export const RAPPORT_ZINNENBANK: Record<string, string[]> = {
  kennis: ["legt nieuwe begrippen steeds beter uit", "past de behandelde kennis toe in opdrachten"],
  vaardigheden: ["werkt steeds zelfstandiger", "kan stappen in het werk goed uitleggen"],
  werkhouding: ["begint meestal vlot aan een taak", "zet door wanneer iets nog niet direct lukt"],
  sociaalEmotioneel: ["werkt prettig samen met anderen", "luistert naar ideeën van klasgenoten"],
  werkpunt: ["Een volgende stap is om het werk vooraf te plannen.", "Een concrete tip is om het werk aan het einde te controleren."],
};
