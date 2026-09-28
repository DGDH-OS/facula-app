"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clampInt, limitString } from "@/lib/validation";

/**
 * Concept-opslag voor de drie wizards. Wie halverwege wegnavigeert of per
 * ongeluk verspringt, vindt de invoer terug. Drie dingen maken dit meer
 * dan een losse sessionStorage-call:
 *
 *  1. De sleutel bevat de user-id. Op een gedeelde computer mag een
 *     concept van de een niet opduiken bij de ander. Geen ingelogde
 *     gebruiker betekent: niets opslaan, niets terugzetten.
 *  2. Wat terugkomt is niet te vertrouwen. Elk veld gaat langs een eigen
 *     type- en grenscontrole, een ongeldig veld valt terug op de default,
 *     onleesbare JSON wist de sleutel.
 *  3. De user-id komt asynchroon binnen en in die tijd kan er al getypt
 *     zijn. Daarom: terugzetten alleen als er nog niets gewijzigd is, en
 *     opslaan start pas zodra de sleutel bekend is, met de waarde die er
 *     op dat moment staat. Zo gaat de eerste invoer nooit verloren.
 */

/** Prefix van elke concept-sleutel. AppShell wist hierop bij uitloggen. */
export const CONCEPT_PREFIX = "facula-draft-";

/**
 * Wist elk bewaard concept. Loopt bij uitloggen, vóór signOut: daarna is
 * de user-id weg en is niet meer te zien welke sleutels bij de
 * vertrekkende gebruiker hoorden.
 */
export function wisAlleConcepten() {
  if (typeof window === "undefined") return;
  try {
    const sleutels: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const sleutel = sessionStorage.key(i);
      if (sleutel?.startsWith(CONCEPT_PREFIX)) sleutels.push(sleutel);
    }
    for (const sleutel of sleutels) sessionStorage.removeItem(sleutel);
  } catch {
    // sessionStorage kan geblokkeerd zijn; uitloggen mag daar niet op stuklopen.
  }
}

/**
 * Getal uit een concept. Bewust strenger dan `clampInt` alleen: een
 * string als "50" is hier geen geldig getal, want zo heeft de wizard het
 * nooit opgeslagen. Buiten [min, max] of een ander type geeft null,
 * waarop de aanroeper de default neemt.
 */
export function conceptGetal(
  waarde: unknown,
  min: number,
  max: number
): number | null {
  return typeof waarde === "number" ? clampInt(waarde, min, max) : null;
}

/** Tekst uit een concept: alleen een string die niet te lang is. */
export function conceptTekst(waarde: unknown, maxLengte: number): string | null {
  return limitString(waarde, maxLengte);
}

/** Keuze uit een concept: alleen een waarde die in de lijst staat. */
export function conceptKeuze<T extends string>(
  waarde: unknown,
  toegestaan: readonly T[]
): T | null {
  return typeof waarde === "string" &&
    (toegestaan as readonly string[]).includes(waarde)
    ? (waarde as T)
    : null;
}

/**
 * `herstel` krijgt de geparste JSON als losse onbekende velden en geeft
 * een volledig geldig object terug. `naHerstel` loopt alleen als er echt
 * een concept is teruggezet, voor afgeleide UI-state zoals een
 * uitgeklapt instellingenblok.
 *
 * Alle argumenten moeten stabiel zijn (module-constante of useCallback
 * zonder deps), anders herhaalt de terugzet-poging zich.
 */
export function useDraft<T>(
  soort: string,
  defaults: T,
  herstel: (ruw: Record<string, unknown>, defaults: T) => T,
  naHerstel?: (hersteld: T) => void
) {
  const [waarde, zetWaardeIntern] = useState<T>(defaults);
  // Zolang de sleutel null is wordt er niets opgeslagen: of de user-id is
  // nog niet binnen, of er is geen ingelogde gebruiker.
  const [sleutel, setSleutel] = useState<string | null>(null);
  const gewijzigd = useRef(false);

  const zetWaarde = useCallback((volgende: T | ((huidig: T) => T)) => {
    gewijzigd.current = true;
    zetWaardeIntern(volgende);
  }, []);

  useEffect(() => {
    let afgebroken = false;

    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (afgebroken) return;
        const userId = data.user?.id;
        if (!userId) return;

        const eigenSleutel = `${CONCEPT_PREFIX}${soort}-${userId}`;
        let ruw: string | null = null;
        try {
          ruw = sessionStorage.getItem(eigenSleutel);
        } catch {
          // Geen opslag beschikbaar: de wizard werkt verder zonder concept.
          return;
        }

        if (ruw && !gewijzigd.current) {
          try {
            const geparsed: unknown = JSON.parse(ruw);
            if (
              geparsed === null ||
              typeof geparsed !== "object" ||
              Array.isArray(geparsed)
            ) {
              throw new Error("Concept is geen object.");
            }
            const hersteld = herstel(geparsed as Record<string, unknown>, defaults);
            zetWaardeIntern(hersteld);
            naHerstel?.(hersteld);
          } catch {
            try {
              sessionStorage.removeItem(eigenSleutel);
            } catch {
              // Niets te doen: het concept is toch onbruikbaar.
            }
          }
        }

        setSleutel(eigenSleutel);
      })
      .catch(() => {
        // Zonder gebruiker geen concept-opslag.
      });

    return () => {
      afgebroken = true;
    };
  }, [soort, defaults, herstel, naHerstel]);

  useEffect(() => {
    if (!sleutel) return;
    try {
      sessionStorage.setItem(sleutel, JSON.stringify(waarde));
    } catch {
      // Vol of geblokkeerd: het concept gaat verloren, de invoer niet.
    }
  }, [sleutel, waarde]);

  const wisConcept = useCallback(() => {
    if (!sleutel) return;
    try {
      sessionStorage.removeItem(sleutel);
    } catch {
      // Zie boven: opslag kan geblokkeerd zijn.
    }
  }, [sleutel]);

  return { waarde, zetWaarde, wisConcept };
}
