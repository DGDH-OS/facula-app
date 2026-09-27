"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={bezig}
        className="rounded-full bg-[var(--color-marine)] px-6 py-3 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:cursor-wait disabled:opacity-60"
      >
        {bezig ? "Bezig…" : "Download mijn gegevens"}
      </button>
      {fout && <p className="text-xs text-red-700">{fout}</p>}
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
    <div className="rounded-2xl border-2 border-red-600/40 bg-red-50 p-6">
      <h2 className="font-display text-xl text-red-800">Account verwijderen</h2>
      <p className="mt-2 text-sm leading-relaxed text-red-900/80">
        Dit verwijdert je account en al je lessen, toetsen, rapportteksten en
        versiegeschiedenis <strong>direct en permanent</strong>. Dit kan niet
        ongedaan gemaakt worden.
      </p>

      {!tonen ? (
        <button
          type="button"
          onClick={() => setTonen(true)}
          className="mt-4 rounded-full border-2 border-red-700 px-6 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-100"
        >
          Account verwijderen
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-red-900">
            Typ <span className="font-mono font-bold">VERWIJDER</span> om te bevestigen
          </label>
          <input
            type="text"
            value={bevestiging}
            onChange={(e) => setBevestiging(e.target.value)}
            className="w-full rounded-lg border-2 border-red-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-600"
            placeholder="VERWIJDER"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={bevestiging !== "VERWIJDER" || bezig}
              className="rounded-full bg-red-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bezig ? "Bezig…" : "Definitief verwijderen"}
            </button>
            <button
              type="button"
              onClick={() => {
                setTonen(false);
                setBevestiging("");
                setFout(null);
              }}
              className="rounded-full border border-red-300 px-6 py-3 text-sm font-medium text-red-800 transition hover:bg-red-100"
            >
              Annuleren
            </button>
          </div>
          {fout && <p className="text-sm text-red-800">{fout}</p>}
        </div>
      )}
    </div>
  );
}
