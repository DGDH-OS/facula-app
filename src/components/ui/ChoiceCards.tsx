"use client";

import { useId } from "react";

export interface Keuze<T extends string | number> {
  waarde: T;
  label: string;
  /** Eén korte regel onder het label. Optioneel. */
  toelichting?: string;
}

/**
 * Grote keuzeknoppen in plaats van een select of vrij getalveld.
 *
 * Bewust op echte radio-inputs gebouwd, niet op knoppen met
 * `aria-pressed`: dan werken pijltjestoetsen, Tab springt de groep als
 * geheel in en uit, en een screenreader leest "3 van 4" voor. De
 * selectie is nooit alleen kleur: er komt een vinkje bij, het label
 * wordt vet, en de rand wordt marine (14,6:1 tegen ivoor, ruim boven de
 * 3:1 die WCAG voor niet-tekstcontrast vraagt).
 */
export function ChoiceCards<T extends string | number>({
  legend,
  hulptekst,
  keuzes,
  waarde,
  onChange,
  kolommen = 2,
}: {
  legend: string;
  hulptekst?: string;
  keuzes: Keuze<T>[];
  waarde: T;
  onChange: (waarde: T) => void;
  kolommen?: 2 | 3 | 4;
}) {
  const naam = useId();
  const hulpId = `${naam}-hulp`;

  const kolomKlassen =
    kolommen === 4
      ? "sm:grid-cols-4"
      : kolommen === 3
        ? "sm:grid-cols-3"
        : "sm:grid-cols-2";

  return (
    <fieldset aria-describedby={hulptekst ? hulpId : undefined}>
      <legend className="text-base font-semibold text-marine">{legend}</legend>

      {hulptekst && (
        <p id={hulpId} className="mt-1 text-base text-tekst-zacht">
          {hulptekst}
        </p>
      )}

      <div className={`mt-3 grid grid-cols-1 gap-3 ${kolomKlassen}`}>
        {keuzes.map((keuze) => {
          const gekozen = keuze.waarde === waarde;
          return (
            <label
              key={String(keuze.waarde)}
              className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors duration-200 ${
                gekozen
                  ? "border-marine bg-ivoor-deep"
                  : "border-lijn bg-ivoor hover:border-marine"
              }`}
            >
              <input
                type="radio"
                name={naam}
                value={String(keuze.waarde)}
                checked={gekozen}
                onChange={() => onChange(keuze.waarde)}
                className="mt-1 h-6 w-6 shrink-0 accent-marine"
              />
              <span className="min-w-0">
                <span
                  className={`block text-base text-marine ${
                    gekozen ? "font-bold" : "font-medium"
                  }`}
                >
                  {keuze.label}
                  {gekozen && (
                    <span className="ml-2 font-bold" aria-hidden>
                      ✓
                    </span>
                  )}
                </span>
                {keuze.toelichting && (
                  <span className="mt-1 block text-base text-tekst-zacht">
                    {keuze.toelichting}
                  </span>
                )}
                {gekozen && <span className="sr-only">gekozen</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
