"use client";

import { useEffect, useState } from "react";

/** Na hoeveel ms de "duurt soms langer"-regel erbij komt (brief 10.5). */
const GEDULD_NA_MS = 15_000;

/**
 * Rustige voortgangsmelding tijdens genereren.
 *
 * Twee bewuste keuzes uit de brief:
 * - standaard geen seconden-claim ("dit duurt ongeveer 10 seconden"), want
 *   die klopt soms niet en dan voelt de app stuk. In plaats daarvan komt er
 *   na `geduldNaMs` een tweede regel bij die zegt dat het langer kan duren.
 *   Waar de duur wél voorspelbaar is, mag de aanroeper hem in `tekst` zetten
 *   en `geduldNaMs` verhogen; zie de lesgenerator, waar een AI-les 15 tot 30
 *   seconden kost en een geduldregel na 15 seconden dus altijd zou vuren.
 * - `aria-live="polite"`, zodat een screenreader de statuswijziging
 *   voorleest zonder de gebruiker te onderbreken.
 */
export function ProgressNotice({
  bezig,
  tekst = "Bezig met maken...",
  geduldNaMs = GEDULD_NA_MS,
}: {
  bezig: boolean;
  tekst?: string;
  geduldNaMs?: number;
}) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {bezig && (
        <div className="rounded-xl border-2 border-marine bg-ivoor-deep px-5 py-4">
          <p className="flex items-center gap-3 text-base font-semibold text-marine">
            <span
              className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-lijn border-t-marine"
              aria-hidden
            />
            {tekst}
          </p>
          <GeduldRegel naMs={geduldNaMs} />
        </div>
      )}
    </div>
  );
}

/**
 * Staat bewust in een eigen component: die bestaat alleen zolang het
 * genereren loopt. Daardoor is er geen reset-effect nodig, en wordt
 * `setState` alleen nog aangeroepen vanuit de timer-callback.
 */
function GeduldRegel({ naMs }: { naMs: number }) {
  const [tonen, setTonen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTonen(true), naMs);
    return () => clearTimeout(timer);
  }, [naMs]);

  if (!tonen) return null;

  return (
    <p className="mt-2 text-base text-tekst-zacht">
      Nog even geduld, dit duurt soms langer.
    </p>
  );
}
