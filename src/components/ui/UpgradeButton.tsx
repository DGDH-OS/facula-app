"use client";

import { useState } from "react";

/**
 * Upgrade-knop voor het dashboard. Post naar /api/stripe/checkout en
 * volgt de redirect-URL die Stripe teruggeeft. Zolang Stripe nog niet
 * geconfigureerd is (env vars ontbreken) geeft die route een 503 terug —
 * deze knop toont dan een nette "binnenkort beschikbaar"-melding in
 * plaats van stilzwijgend niets te doen of een kapotte flow te starten.
 */
export function UpgradeButton() {
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  async function handleClick() {
    setBezig(true);
    setMelding(null);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });

      if (response.status === 503) {
        setMelding("Upgraden is binnenkort beschikbaar.");
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Kon niet doorschakelen naar de betaalpagina.");
      }

      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      setMelding(
        err instanceof Error ? err.message : "Er ging iets mis. Probeer het later opnieuw."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={bezig}
        className="rounded-full bg-[var(--color-goud)] px-5 py-2.5 text-sm font-semibold text-[var(--color-marine)] transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60"
      >
        {bezig ? "Bezig…" : "Upgrade naar onbeperkt"}
      </button>
      {melding && <p className="text-xs text-[var(--color-inkt)]/60">{melding}</p>}
    </div>
  );
}
