"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

/** Ondergrens uit de brief (10.6): minstens 15 seconden zichtbaar. */
const MINIMALE_ZICHTBAARHEID_MS = 15_000;

/**
 * "Ongedaan maken" inline onder de actie, niet als toast in een hoek.
 * Een toast die na 4 seconden wegschuift is voor deze doelgroep geen
 * uitweg: hij is weg voordat je gelezen hebt wat er stond.
 *
 * `zichtbaarMs` mag hoger dan 15 seconden, niet lager.
 */
export function InlineUndo({
  melding,
  onUndo,
  zichtbaarMs = MINIMALE_ZICHTBAARHEID_MS,
  undoLabel = "Ongedaan maken",
}: {
  melding: string | null;
  onUndo: () => void;
  zichtbaarMs?: number;
  undoLabel?: string;
}) {
  if (!melding) return null;

  return (
    <UndoMelding
      key={melding}
      melding={melding}
      onUndo={onUndo}
      zichtbaarMs={zichtbaarMs}
      undoLabel={undoLabel}
    />
  );
}

/**
 * De aftelling zit in een eigen component met `key={melding}`: bij een
 * nieuwe melding wordt die opnieuw gemonteerd, dus begint de teller vanzelf
 * opnieuw. Zo hoeft geen effect de zichtbaarheid terug te zetten.
 */
function UndoMelding({
  melding,
  onUndo,
  zichtbaarMs,
  undoLabel,
}: {
  melding: string;
  onUndo: () => void;
  zichtbaarMs: number;
  undoLabel: string;
}) {
  const [zichtbaar, setZichtbaar] = useState(true);

  useEffect(() => {
    const duur = Math.max(zichtbaarMs, MINIMALE_ZICHTBAARHEID_MS);
    const timer = setTimeout(() => setZichtbaar(false), duur);
    return () => clearTimeout(timer);
  }, [zichtbaarMs]);

  if (!zichtbaar) return null;

  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-3 rounded-xl border-2 border-marine bg-ivoor-deep px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-base text-tekst">{melding}</p>
      <Button
        variant="secondary"
        onClick={() => {
          setZichtbaar(false);
          onUndo();
        }}
      >
        {undoLabel}
      </Button>
    </div>
  );
}
