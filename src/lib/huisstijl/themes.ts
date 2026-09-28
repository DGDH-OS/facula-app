/**
 * De huisstijl van een docent: kleuren, lettertype, schoolnaam en logo.
 *
 * Eén bron voor het scherm én voor de exports. De PowerPoint- en Word-export
 * lezen dezelfde kleuren als de voorbeeldweergave in de app, zodat wat de
 * docent ziet ook is wat er uit de download komt.
 *
 * Contrast is hier een harde eis en geen advies. De doelgroep is 60+ en de
 * uitvoer belandt op een beamer achter in een lokaal: tekst die op het scherm
 * van de docent net leesbaar is, is daar onleesbaar. Vandaar dezelfde WCAG-
 * ondergrens als de rest van de app (zie src/app/globals.css): 4,5:1 voor
 * tekst op de achtergrond, 3:1 voor het accent, dat alleen voor koppen, lijnen
 * en vlakken gebruikt wordt.
 */

export type PresetNaam = "facula" | "mihiriban" | "rustig" | "contrast" | "eigen";
export type Lettertype = "sans" | "serif";

export interface Huisstijl {
  preset: PresetNaam;
  /** #RRGGBB, voor koppen, accentbalken en lijnen. */
  accent: string;
  /** #RRGGBB, voor gewone tekst. */
  tekst: string;
  /** #RRGGBB, achtergrond van dia en pagina. */
  achtergrond: string;
  lettertype: Lettertype;
  schoolnaam: string | null;
  /**
   * Pad in de bucket school-logos: exact "<user_id>/logo", zonder extensie.
   * Eén vast pad per docent, zodat een upload zichzelf overschrijft en nooit
   * een ander object hoeft te verwijderen. Zie geldigLogoPad() in
   * src/lib/huisstijl/server.ts, dat dit vóór elk gebruik nog eens toetst.
   */
  logoPath: string | null;
  /**
   * Het bestandstype van dat object ("image/png" of "image/jpeg"). Los
   * opgeslagen omdat het pad geen extensie meer draagt; null als het onbekend
   * is, en dan leiden de lezers het uit de bestandskop af.
   */
  logoMime: LogoMimeType | null;
  logoStandaardAan: boolean;
}

/** De kleur/letter-kant van een huisstijl, zonder school- en logogegevens. */
export type Kleurenset = Pick<
  Huisstijl,
  "accent" | "tekst" | "achtergrond" | "lettertype"
>;

export const MIN_CONTRAST_TEKST = 4.5;
export const MIN_CONTRAST_ACCENT = 3;

/** Alleen png en jpeg: zie sanitize-afweging in POST /api/huisstijl/logo. */
export const TOEGESTANE_LOGO_TYPES = ["image/png", "image/jpeg"] as const;
export type LogoMimeType = (typeof TOEGESTANE_LOGO_TYPES)[number];
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/** Of dit een van de twee toegestane logo-bestandstypen is. */
export function isToegestaanLogoType(mime: unknown): mime is LogoMimeType {
  return (
    typeof mime === "string" &&
    (TOEGESTANE_LOGO_TYPES as readonly string[]).includes(mime)
  );
}

/**
 * De vier kant-en-klare stijlen. Elke combinatie hieronder is gemeten en komt
 * boven de ondergrenzen uit; scripts/huisstijl-smoke.ts controleert dat
 * opnieuw, zodat een latere kleurtweak niet stilletjes onder 4,5:1 zakt.
 */
export const PRESETS: Record<Exclude<PresetNaam, "eigen">, Kleurenset & { label: string; omschrijving: string }> = {
  facula: {
    label: "Facula",
    omschrijving: "Ivoor met marineblauw. De standaardstijl van Facula.",
    accent: "#16233B",
    tekst: "#2A2620",
    achtergrond: "#FAF6EF",
    lettertype: "serif",
  },
  mihiriban: {
    label: "Warm oranje",
    omschrijving: "Zandkleur met terracotta. Warm en rustig op de beamer.",
    accent: "#8F3A16",
    tekst: "#2C2119",
    achtergrond: "#FBF1E8",
    lettertype: "serif",
  },
  rustig: {
    label: "Rustig grijsblauw",
    omschrijving: "Koel en zakelijk. Weinig kleur, veel rust.",
    accent: "#33506B",
    tekst: "#23282E",
    achtergrond: "#F5F7F9",
    lettertype: "sans",
  },
  contrast: {
    label: "Maximaal contrast",
    omschrijving: "Wit en geel op zwart. Voor een zaal met veel licht.",
    accent: "#FFD400",
    tekst: "#FFFFFF",
    achtergrond: "#000000",
    lettertype: "sans",
  },
};

export const STANDAARD_PRESET: PresetNaam = "facula";

export const STANDAARD_HUISSTIJL: Huisstijl = {
  preset: STANDAARD_PRESET,
  ...PRESETS.facula,
  schoolnaam: null,
  logoPath: null,
  logoMime: null,
  logoStandaardAan: true,
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Normaliseert naar #RRGGBB in hoofdletters, of null als het geen kleur is. */
export function normaliseerHex(ruw: unknown): string | null {
  if (typeof ruw !== "string") return null;
  const schoon = ruw.trim();
  if (!HEX.test(schoon)) return null;
  return schoon.toUpperCase();
}

/** Relatieve luminantie volgens WCAG 2.1 (sRGB). */
function luminantie(hex: string): number {
  const kanalen = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lineair = kanalen.map((k) =>
    k <= 0.03928 ? k / 12.92 : Math.pow((k + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * lineair[0] + 0.7152 * lineair[1] + 0.0722 * lineair[2];
}

/** Contrastverhouding tussen twee kleuren, 1 tot 21. */
export function contrast(kleurA: string, kleurB: string): number {
  const a = luminantie(kleurA.toUpperCase());
  const b = luminantie(kleurB.toUpperCase());
  const licht = Math.max(a, b);
  const donker = Math.min(a, b);
  return (licht + 0.05) / (donker + 0.05);
}

export interface ContrastControle {
  ok: boolean;
  tekstRatio: number;
  accentRatio: number;
  /** Lege lijst als het klopt, anders per probleem één zin voor de docent. */
  meldingen: string[];
}

function rond(getal: number): string {
  return getal.toFixed(1).replace(".", ",");
}

/**
 * Controleert of een kleurencombinatie leesbaar genoeg is. Geeft Nederlandse
 * zinnen terug die rechtstreeks op het scherm kunnen: de docent hoort te lezen
 * wát er mis is, niet dat "validatie is mislukt".
 */
export function controleerContrast(set: Kleurenset): ContrastControle {
  const tekstRatio = contrast(set.tekst, set.achtergrond);
  const accentRatio = contrast(set.accent, set.achtergrond);
  const meldingen: string[] = [];

  if (tekstRatio < MIN_CONTRAST_TEKST) {
    meldingen.push(
      "De tekstkleur steekt te weinig af tegen de achtergrond (" +
        rond(tekstRatio) +
        " op 1, nodig is " +
        rond(MIN_CONTRAST_TEKST) +
        "). Kies een donkerdere tekst of een lichtere achtergrond."
    );
  }
  if (accentRatio < MIN_CONTRAST_ACCENT) {
    meldingen.push(
      "De accentkleur steekt te weinig af tegen de achtergrond (" +
        rond(accentRatio) +
        " op 1, nodig is " +
        rond(MIN_CONTRAST_ACCENT) +
        "). Kies een dieper accent of een lichtere achtergrond."
    );
  }

  return { ok: meldingen.length === 0, tekstRatio, accentRatio, meldingen };
}

/**
 * Een zachte lijnkleur, gemengd uit accent en achtergrond. Bewust afgeleid en
 * geen vijfde instelbaar veld: een docent die drie kleuren kiest hoeft geen
 * randkleur te bedenken, en afleiden houdt de lijn per definitie in dezelfde
 * familie als het accent.
 */
export function lijnKleur(set: Kleurenset, aandeel = 0.3): string {
  const meng = (index: number) => {
    const a = parseInt(set.accent.slice(index, index + 2), 16);
    const b = parseInt(set.achtergrond.slice(index, index + 2), 16);
    return Math.round(a * aandeel + b * (1 - aandeel));
  };
  return (
    "#" +
    [1, 3, 5]
      .map((i) => meng(i).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * Een gedempte variant van de tekstkleur voor bijzaken (meta-regels, footers).
 * Blijft naar de achtergrond toe gemengd, dus nooit lichter dan de
 * achtergrond zelf, en houdt daarmee de leesrichting van het thema aan.
 */
export function zachteTekstKleur(set: Kleurenset): string {
  return lijnKleur({ ...set, accent: set.tekst }, 0.75);
}

/** De lettertypenaam die PowerPoint en Word moeten gebruiken. */
export function exportFont(lettertype: Lettertype): string {
  return lettertype === "serif" ? "Georgia" : "Arial";
}

/** Dezelfde keuze, maar als CSS font-stack voor de voorbeeldweergave. */
export function cssFontStack(lettertype: Lettertype): string {
  return lettertype === "serif"
    ? "Georgia, 'Times New Roman', serif"
    : "Arial, Helvetica, sans-serif";
}

/** Hex zonder '#', de vorm die pptxgenjs en docx verwachten. */
export function zonderHekje(kleur: string): string {
  return kleur.replace("#", "").toUpperCase();
}

/** De vorm waarin een huisstijl in facula.huisstijl staat. */
export interface HuisstijlRij {
  preset?: unknown;
  accent?: unknown;
  tekst?: unknown;
  achtergrond?: unknown;
  lettertype?: unknown;
  schoolnaam?: unknown;
  logo_path?: unknown;
  logo_mime?: unknown;
  logo_standaard_aan?: unknown;
}

function isPreset(ruw: unknown): ruw is PresetNaam {
  return (
    ruw === "facula" ||
    ruw === "mihiriban" ||
    ruw === "rustig" ||
    ruw === "contrast" ||
    ruw === "eigen"
  );
}

function isLettertype(ruw: unknown): ruw is Lettertype {
  return ruw === "sans" || ruw === "serif";
}

/**
 * Zet een databaserij (of het ontbreken ervan) om naar een bruikbare
 * Huisstijl. Nooit gooien: een docent zonder rij, of met een rij uit een
 * oudere versie, hoort gewoon de standaardstijl te krijgen en geen foutpagina.
 *
 * Bij een bekende preset winnen de kleuren van die preset van wat er in de rij
 * staat. Zo verandert een preset die later wordt bijgesteld mee voor iedereen
 * die hem gekozen heeft, en blijft alleen "eigen" echt vrij.
 */
export function resolveHuisstijl(rij: HuisstijlRij | null | undefined): Huisstijl {
  if (!rij) return STANDAARD_HUISSTIJL;

  const preset = isPreset(rij.preset) ? rij.preset : STANDAARD_PRESET;
  const schoolnaam =
    typeof rij.schoolnaam === "string" && rij.schoolnaam.trim()
      ? rij.schoolnaam.trim().slice(0, 120)
      : null;
  const logoPath = typeof rij.logo_path === "string" && rij.logo_path ? rij.logo_path : null;
  // Een onbekend of ontbrekend type is geen fout: de lezers vallen dan terug
  // op de bestandskop van het object zelf (zie mimeUitBytes in logo.ts).
  const logoMime = isToegestaanLogoType(rij.logo_mime) ? rij.logo_mime : null;
  const logoStandaardAan = rij.logo_standaard_aan !== false;

  if (preset !== "eigen") {
    return {
      preset,
      ...PRESETS[preset],
      schoolnaam,
      logoPath,
      logoMime,
      logoStandaardAan,
    };
  }

  const eigen: Kleurenset = {
    accent: normaliseerHex(rij.accent) ?? PRESETS.facula.accent,
    tekst: normaliseerHex(rij.tekst) ?? PRESETS.facula.tekst,
    achtergrond: normaliseerHex(rij.achtergrond) ?? PRESETS.facula.achtergrond,
    lettertype: isLettertype(rij.lettertype) ? rij.lettertype : PRESETS.facula.lettertype,
  };

  // Een eigen combinatie die niet meer door de contrastcheck komt (bijvoorbeeld
  // opgeslagen vóór deze check bestond) wordt teruggezet op Facula in plaats
  // van onleesbaar geëxporteerd te worden.
  if (!controleerContrast(eigen).ok) {
    return {
      preset: "facula",
      ...PRESETS.facula,
      schoolnaam,
      logoPath,
      logoMime,
      logoStandaardAan,
    };
  }

  return { preset, ...eigen, schoolnaam, logoPath, logoMime, logoStandaardAan };
}
