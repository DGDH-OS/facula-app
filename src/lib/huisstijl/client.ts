"use client";

import { useCallback, useEffect, useState } from "react";
import { maakLogo, type Logo } from "./logo";
import { resolveHuisstijl, STANDAARD_HUISSTIJL, type Huisstijl } from "./themes";

/**
 * Client-side toegang tot de huisstijl en het schoollogo.
 *
 * De browser haalt het logo bij onze eigen route en niet bij de bucket: die is
 * privé. GET /api/huisstijl/logo levert de afbeelding, en de afmetingen worden
 * hier uit de bestandskop gelezen zodat het logo in Word de juiste verhouding
 * houdt.
 */

export interface HuisstijlState {
  huisstijl: Huisstijl;
  /** Null zolang er nog niets geladen is, of als er geen logo is. */
  logo: Logo | null;
  laden: boolean;
}

/** Haalt de opgeslagen huisstijl op. Faalt zacht naar de standaardstijl. */
export async function haalHuisstijlClient(): Promise<Huisstijl> {
  try {
    const response = await fetch("/api/huisstijl", { cache: "no-store" });
    if (!response.ok) return STANDAARD_HUISSTIJL;
    const data = await response.json();
    return (data?.huisstijl as Huisstijl) ?? STANDAARD_HUISSTIJL;
  } catch {
    return STANDAARD_HUISSTIJL;
  }
}

/** Haalt het schoollogo op, of null als er geen (bruikbaar) logo is. */
export async function haalLogoClient(): Promise<Logo | null> {
  try {
    const response = await fetch("/api/huisstijl/logo", { cache: "no-store" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    const bytes = new Uint8Array(await response.arrayBuffer());
    return maakLogo(bytes, type.split(";")[0].trim());
  } catch {
    return null;
  }
}

/**
 * Laadt de huisstijl en, als die een logo heeft, het logo erbij.
 *
 * Bewust één hook voor beide: elk exportscherm heeft ze allebei nodig, en twee
 * losse hooks zouden op elk scherm dezelfde twee aanroepen laten herhalen.
 */
export function useHuisstijl(): HuisstijlState & { herlaad: () => void } {
  const [state, setState] = useState<HuisstijlState>({
    huisstijl: STANDAARD_HUISSTIJL,
    logo: null,
    laden: true,
  });
  const [ronde, setRonde] = useState(0);

  const herlaad = useCallback(() => setRonde((n) => n + 1), []);

  useEffect(() => {
    let actueel = true;

    (async () => {
      const huisstijl = await haalHuisstijlClient();
      const logo = huisstijl.logoPath ? await haalLogoClient() : null;
      // Een tweede aanroep kan de eerste al hebben ingehaald; dan hoort het
      // oude antwoord niet meer over het nieuwe heen te schrijven.
      if (!actueel) return;
      setState({ huisstijl: resolveHuisstijlVeilig(huisstijl), logo, laden: false });
    })();

    return () => {
      actueel = false;
    };
  }, [ronde]);

  return { ...state, herlaad };
}

/**
 * De server stuurt al een opgeloste Huisstijl, maar dit is clientinvoer zodra
 * het door JSON is geweest. Nog een keer door dezelfde resolver dus, met
 * dezelfde contrastcheck die de exports gebruiken.
 */
function resolveHuisstijlVeilig(huisstijl: Huisstijl): Huisstijl {
  return resolveHuisstijl({
    preset: huisstijl.preset,
    accent: huisstijl.accent,
    tekst: huisstijl.tekst,
    achtergrond: huisstijl.achtergrond,
    lettertype: huisstijl.lettertype,
    schoolnaam: huisstijl.schoolnaam,
    logo_path: huisstijl.logoPath,
    logo_mime: huisstijl.logoMime,
    logo_standaard_aan: huisstijl.logoStandaardAan,
  });
}

/**
 * De schakelaar "Schoollogo tonen" op een exportscherm.
 *
 * De beginstand komt uit de huisstijl (logo_standaard_aan), maar zodra de
 * docent hem zelf omzet, wint die keuze. Bewust afgeleid en niet in een effect
 * gespiegeld: de beginstand is pas bekend als de huisstijl geladen is, en dat
 * in state overschrijven zou een extra renderronde kosten en de keuze van de
 * docent kunnen terugdraaien zodra de huisstijl opnieuw binnenkomt.
 */
export function useLogoKeuze(
  huisstijl: Huisstijl
): [boolean, (aan: boolean) => void] {
  const [keuze, setKeuze] = useState<boolean | null>(null);
  const standaard = huisstijl.logoStandaardAan && Boolean(huisstijl.logoPath);
  return [keuze ?? standaard, setKeuze];
}
