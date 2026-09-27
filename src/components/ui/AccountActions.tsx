"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/**
 * Downloadt de export-JSON via een verborgen link i.p.v. window.location —
 * zo blijft de gebruiker op de accountpagina en krijgt een nette
 * foutmelding als de export mislukt, in plaats van een kale browsertab met
 * een foutstatus.
 */
export function ExportDataButton() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function handleClick() {
    setBezig(true);
    setFout(null);
    try {
      const response = await fetch("/api/account/export");
      if (!response.ok) {
        throw new Error("Kon je gegevens niet ophalen.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `facula-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={handleClick} disabled={bezig}>
        {bezig ? "Bezig met ophalen..." : "Download mijn gegevens"}
      </Button>
      {fout && (
        <p
          aria-live="polite"
          className="rounded-lg border-2 border-fout-tekst bg-fout-vlak px-4 py-3 text-base font-medium text-fout-tekst"
        >
          {fout}
        </p>
      )}
    </div>
  );
}

/**
 * Verwijder-sectie met expliciete typ-bevestiging, geen enkele-klik-actie.
 * Gebruikt hoog contrast en een letterlijke bevestigingstekst zodat een
 * misklik nooit tot verwijdering leidt.
 */
export function DeleteAccountSection() {
  const router = useRouter();
  const [tonen, setTonen] = useState(false);
  const [bevestiging, setBevestiging] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function handleDelete() {
    // Brief 10.3: geen disabled knop, maar een actieve knop die zegt wat
    // er nog ontbreekt. De server valideert dit woord nog een keer, dus
    // dit is een hulpmiddel voor de gebruiker, geen veiligheidsmaatregel.
    if (bevestiging !== "VERWIJDER") {
      setFout("Typ eerst het woord VERWIJDER in het veld hierboven.");
      return;
    }

    setBezig(true);
    setFout(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: bevestiging }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Verwijderen mislukt.");
      }

      router.push("/?accountVerwijderd=1");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
      setBezig(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-fout-tekst bg-fout-vlak p-6">
      <h2 className="font-display text-xl text-fout-tekst">Account verwijderen</h2>
      <p className="mt-2 text-base text-fout-tekst">
        Dit verwijdert je account en al je lessen, toetsen, rapportteksten en
        versiegeschiedenis <strong>direct en permanent</strong>. Dit kan niet
        ongedaan gemaakt worden.
      </p>

      {!tonen ? (
        <button
          type="button"
          onClick={() => setTonen(true)}
          className="mt-4 inline-flex min-h-14 items-center justify-center rounded-full border-2 border-fout-tekst px-7 text-base font-semibold text-fout-tekst"
        >
          Account verwijderen
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="verwijder-bevestiging"
              className="block text-base font-semibold text-fout-tekst"
            >
              Typ het woord VERWIJDER om te bevestigen
            </label>
            <input
              id="verwijder-bevestiging"
              type="text"
              autoComplete="off"
              value={bevestiging}
              onChange={(e) => {
                setBevestiging(e.target.value);
                setFout(null);
              }}
              className="mt-2 min-h-14 w-full rounded-lg border-2 border-fout-tekst bg-ivoor px-4 py-3 text-base text-tekst"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={bezig}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-fout-tekst px-7 text-base font-semibold text-ivoor disabled:cursor-wait disabled:opacity-70"
            >
              {bezig ? "Bezig met verwijderen..." : "Definitief verwijderen"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTonen(false);
                setBevestiging("");
                setFout(null);
              }}
              className="inline-flex min-h-14 items-center justify-center rounded-full border-2 border-fout-tekst px-7 text-base font-semibold text-fout-tekst"
            >
              Annuleren
            </button>
          </div>
          {fout && (
            <p aria-live="polite" className="text-base font-semibold text-fout-tekst">
              {fout}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
