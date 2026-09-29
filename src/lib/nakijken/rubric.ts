import type { Criterium, Niveau, Rubric, RubricLevel } from "./types";
export const STARTERS: Record<string, { titel: string; criteria: string[] }> = {
  "Betoog schrijven": { titel: "Betoog schrijven", criteria: ["Standpunt en argumenten", "Opbouw", "Taal en brongebruik"] },
  Presentatie: { titel: "Presentatie", criteria: ["Inhoud", "Opbouw en uitleg", "Presenteren"] }, Werkstuk: { titel: "Werkstuk", criteria: ["Inhoud en onderzoek", "Structuur", "Verzorging"] },
  Samenwerkopdracht: { titel: "Samenwerkopdracht", criteria: ["Bijdrage", "Overleggen", "Resultaat"] }, "Rekenopdracht met uitleg": { titel: "Rekenopdracht met uitleg", criteria: ["Rekenstappen", "Uitleg", "Antwoord controleren"] }, "Practicum verslag": { titel: "Practicum verslag", criteria: ["Werkwijze", "Waarnemingen", "Conclusie"] },
};
export const DEFAULT_LEVELS: RubricLevel[] = [
  { label: "Onvoldoende", descriptor: "Het doel is nog niet zichtbaar.", punten: 1 }, { label: "Voldoende", descriptor: "Het doel is deels en met hulp zichtbaar.", punten: 2 }, { label: "Goed", descriptor: "Het doel is duidelijk en meestal zelfstandig zichtbaar.", punten: 3 }, { label: "Uitstekend", descriptor: "Het doel is helder, zelfstandig en sterk zichtbaar.", punten: 4 },
];
export function nieuwCriterium(naam = "Nieuw criterium"): Criterium { return { id: `criterium-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, naam, niveaus: DEFAULT_LEVELS.map((level) => ({ ...level })) }; }
export function valideerRubric(rubric: Rubric): string[] { const fouten: string[] = []; if (!rubric.titel.trim()) fouten.push("Vul een opdracht in."); if (rubric.criteria.length < 2 || rubric.criteria.length > 6) fouten.push("Gebruik 2 tot 6 criteria."); rubric.criteria.forEach((c) => { if (!c.naam.trim()) fouten.push("Geef elk criterium een naam."); if (c.niveaus.length < 3 || c.niveaus.length > 4) fouten.push("Gebruik 3 of 4 niveaus per criterium."); }); return fouten; }
export function puntenVoor(criterium: Criterium, niveau: Niveau) { return criterium.niveaus[niveau - 1]?.punten ?? 0; }
export function berekenCijfer(punten: number, maxPunten: number, cesuur: number) { if (maxPunten <= 0) return 0; const percentage = punten / maxPunten; const cijfer = 1 + 9 * ((percentage - cesuur / 100) / Math.max(1 - cesuur / 100, 0.01)); return Math.round(Math.max(1, Math.min(10, cijfer)) * 10) / 10; }
