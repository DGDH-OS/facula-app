import { KENNISBANK, type KennisEntry } from "./kennisbank";

export type PiiResult = { bevatPii: boolean; reden?: string };
const medische =
  /\b(diabetes|adhd|autisme|medicatie|depressie|diagnose|dyslexie|gezondheid|allergie)\b/i;
const email = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/i;
const emailGlobaal = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
const telefoon =
  /(?:\+?31\s?6|06)[\s-]?\d{4}[\s-]?\d{4}|\b\d{3}[\s-]\d{2}[\s-]\d{2}[\s-]\d{2}\b/;
const telefoonGlobaal =
  /(?:\+?31\s?6|06)[\s-]?\d{4}[\s-]?\d{4}|\b\d{3}[\s-]\d{2}[\s-]\d{2}[\s-]\d{2}\b/g;
const medischeGlobaal =
  /\b(diabetes|adhd|autisme|medicatie|depressie|diagnose|dyslexie|gezondheid|allergie)\b/gi;
const naam =
  /\b[A-ZÁÉÍÓÚÀÈÌÒÙ][a-záéíóúàèìòù]+\s+[A-ZÁÉÍÓÚÀÈÌÒÙ][a-záéíóúàèìòù]+\b/g;
const gewoneWoorden = new Set([
  "mag",
  "ik",
  "wat",
  "is",
  "hoe",
  "maak",
  "een",
  "toets",
  "directe",
  "instructie",
  "kan",
  "voor",
  "mijn",
  "de",
  "het",
  "van",
  "naar",
  "met",
  "over",
  "waar",
]);
function bevatVolledigeNaam(tekst: string): boolean {
  for (const match of tekst.matchAll(naam)) {
    const paar = match[0].toLowerCase().split(/\s+/);
    if (paar.some((woord) => gewoneWoorden.has(woord))) continue;
    return true;
  }
  return false;
}
export function controleerCoachPii(tekst: string): PiiResult {
  if (email.test(tekst)) return { bevatPii: true, reden: "een e-mailadres" };
  if (telefoon.test(tekst))
    return { bevatPii: true, reden: "een telefoonnummer" };
  if (medische.test(tekst))
    return { bevatPii: true, reden: "medische informatie" };
  naam.lastIndex = 0;
  if (bevatVolledigeNaam(tekst))
    return { bevatPii: true, reden: "een volledige naam" };
  return { bevatPii: false };
}
export function normaliseer(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/(en|s|je)$/i, ""))
    .join(" ");
}
const woorden = (s: string) =>
  new Set(normaliseer(s).split(" ").filter(Boolean));
export type MatchResult = {
  entry: KennisEntry | null;
  related: KennisEntry[];
  score: number;
};
export function matchCoachVraag(vraag: string): MatchResult {
  const q = woorden(vraag);
  const scored = KENNISBANK.map((entry) => {
    const keys = new Set(entry.trefwoorden.flatMap((x) => [...woorden(x)]));
    const overlap = [...q].filter((w) => keys.has(w)).length;
    const phrase = entry.vragen.some((v) =>
      normaliseer(vraag).includes(normaliseer(v)),
    )
      ? 3
      : 0;
    return { entry, score: overlap + phrase };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  return {
    entry: top && top.score >= 1 ? top.entry : null,
    related:
      top?.score >= 1
        ? scored.filter((item) => item.score >= 1).slice(1, 3).map((item) => item.entry)
        : [],
    score: top?.score ?? 0,
  };
}
export function zoekUrls(vraag: string): string[] {
  const schoon = vraag
    .replaceAll(emailGlobaal, "")
    .replaceAll(telefoonGlobaal, "")
    .replaceAll(medischeGlobaal, "")
    .replaceAll(naam, "")
    .trim();
  if (controleerCoachPii(schoon).bevatPii) return [];
  const q = encodeURIComponent(schoon);
  return [
    `https://www.kennisnet.nl/zoeken/?q=${q}`,
    `https://www.slo.nl/zoeken/?q=${q}`,
    `https://www.rijksoverheid.nl/zoeken?trefwoord=${q}`,
    `https://www.onderwijsinspectie.nl/zoeken?keyword=${q}`,
    `https://duckduckgo.com/?q=${q}+site%3Akennisnet.nl+OR+site%3Aslo.nl`,
  ];
}
