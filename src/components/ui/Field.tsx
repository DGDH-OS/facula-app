"use client";

import { useId, type ReactNode } from "react";

/** Klassen voor input/textarea/select, zodat elk veld 56px hoog is. */
export const VELD_KLASSEN =
  "w-full min-h-14 rounded-lg border-2 border-lijn bg-ivoor px-4 py-3 text-base text-tekst placeholder:text-tekst-zacht focus:border-marine";

/**
 * De sleutels zijn bewust de echte attribuutnamen, zodat `{...ids}` op een
 * input direct geldige HTML/ARIA oplevert en de aanroeper niets hoeft te
 * hernoemen (een `describedBy`-prop belandt stil als niets in de DOM).
 */
export interface VeldIds {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean | undefined;
}

/**
 * Label boven het veld, hulptekst eronder, foutmelding gekoppeld via
 * `aria-describedby`. Nooit een placeholder als label: die verdwijnt
 * zodra je begint te typen, en dat is precies waar de doelgroep op
 * vastloopt.
 *
 * Het invoerelement komt als render-functie binnen, zodat Field de id's
 * kan genereren en de aanroeper ze niet zelf hoeft te verzinnen:
 *
 *   <Field label="Leerdoel" hulptekst="In je eigen woorden.">
 *     {(ids) => <textarea {...ids} className={VELD_KLASSEN} />}
 *   </Field>
 */
export function Field({
  label,
  hulptekst,
  fout,
  verplicht = false,
  children,
}: {
  label: string;
  hulptekst?: string;
  fout?: string | null;
  verplicht?: boolean;
  children: (ids: VeldIds) => ReactNode;
}) {
  const basis = useId();
  const id = `${basis}-veld`;
  const hulpId = `${basis}-hulp`;
  const foutId = `${basis}-fout`;

  const describedBy =
    [hulptekst ? hulpId : null, fout ? foutId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-base font-semibold text-marine">
        {label}
        {verplicht && (
          <span className="ml-1 font-normal text-tekst-zacht">(verplicht)</span>
        )}
      </label>

      {hulptekst && (
        <p id={hulpId} className="mt-1 text-base text-tekst-zacht">
          {hulptekst}
        </p>
      )}

      <div className="mt-2">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": fout ? true : undefined,
        })}
      </div>

      {fout && (
        <p
          id={foutId}
          className="mt-2 flex gap-2 rounded-lg border-2 border-fout-tekst bg-fout-vlak px-4 py-3 text-base font-medium text-fout-tekst"
        >
          <span aria-hidden>✕</span>
          <span>{fout}</span>
        </p>
      )}
    </div>
  );
}
