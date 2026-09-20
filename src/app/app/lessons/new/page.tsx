"use client";

import { useState } from "react";
import type { LessonInput, Vak, Niveau } from "@/lib/types";

const VAKKEN: Vak[] = ["Maatschappijleer", "Geschiedenis", "Economie", "Aardrijkskunde"];
const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

const DEFAULT_INPUT: LessonInput = {
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  leerdoel: "",
  lesduur: 50,
  aantalLessen: 1,
};

/**
 * Sterk vereenvoudigde flow: alleen het leerdoel vraagt verplicht aandacht.
 * Vak/niveau/leerjaar/lesduur/aantal lessen staan achter een inklapbaar
 * "instellingen"-blok met verstandige defaults. Bij klikken op de primaire
 * knop wordt de les gegenereerd én de PowerPoint in Mihiriban's eigen
 * sjabloon-stijl direct gedownload — in één vloeiende actie.
 */
export default function NewLessonPage() {
  const [input, setInput] = useState<LessonInput>(DEFAULT_INPUT);
  const [instellingenOpen, setInstellingenOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.leerdoel.trim()) return;

    setBezig(true);
    setFout(null);
    setKlaar(false);

    try {
      const response = await fetch("/api/lessons/mihiriban-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Genereren mislukt.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") ?? "";
      const match = contentDisposition.match(/filename="([^"]+)"/);
      const bestandsnaam = match?.[1] ?? "les.pptx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = bestandsnaam;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setKlaar(true);
    } catch (err) {
      console.error("PowerPoint-export mislukt", err);
      setFout(
        err instanceof Error
          ? err.message
          : "Er ging iets mis bij het genereren van de PowerPoint. Probeer het opnieuw."
      );
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl text-[var(--color-marine)]">
        Nieuwe les genereren
      </h1>
      <p className="mt-1 text-sm text-[var(--color-inkt)]/70">
        Typ je leerdoel en klik op &quot;Maak mijn PowerPoint&quot; — Facula
        genereert de hele les en levert meteen een kant-en-klare PowerPoint
        in jouw eigen sjabloonstijl.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6 rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6"
      >
        <div>
          <label className="block text-base font-semibold text-[var(--color-marine)]">
            Wat is het leerdoel van deze les?
          </label>
          <textarea
            required
            autoFocus
            rows={7}
            value={input.leerdoel}
            onChange={(e) => setInput({ ...input, leerdoel: e.target.value })}
            placeholder="Bijv. Je kunt uitleggen wat de begrippen referentiekader, selectieve waarneming en framing betekenen, en hoe ze samenhangen met maatschappelijke problemen."
            className="mt-2 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-4 py-3 text-base leading-relaxed outline-none focus:border-[var(--color-marine)]"
          />
        </div>

        <button
          type="submit"
          disabled={bezig || !input.leerdoel.trim()}
          className="w-full rounded-full bg-[var(--color-marine)] px-6 py-3.5 text-base font-semibold text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:cursor-wait disabled:opacity-60"
        >
          {bezig ? "Bezig met genereren…" : "Maak mijn PowerPoint"}
        </button>

        {fout && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {fout}
          </p>
        )}
        {klaar && !fout && (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Je PowerPoint is gedownload — check je downloadmap.
          </p>
        )}

        <div className="border-t border-[var(--color-lijn)] pt-4">
          <button
            type="button"
            onClick={() => setInstellingenOpen((v) => !v)}
            className="text-xs font-medium text-[var(--color-inkt)]/60 underline underline-offset-4 hover:text-[var(--color-marine)]"
          >
            {instellingenOpen ? "Instellingen verbergen" : "Instellingen aanpassen (optioneel)"}
          </button>

          {instellingenOpen && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[var(--color-marine)]">Vak</label>
                <select
                  value={input.vak}
                  onChange={(e) => setInput({ ...input, vak: e.target.value as Vak })}
                  className="mt-1 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
                >
                  {VAKKEN.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-marine)]">Niveau</label>
                <select
                  value={input.niveau}
                  onChange={(e) => setInput({ ...input, niveau: e.target.value as Niveau })}
                  className="mt-1 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
                >
                  {NIVEAUS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-marine)]">Leerjaar</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={input.leerjaar}
                  onChange={(e) => setInput({ ...input, leerjaar: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-marine)]">Lesduur (min)</label>
                <input
                  type="number"
                  min={20}
                  max={120}
                  step={5}
                  value={input.lesduur}
                  onChange={(e) => setInput({ ...input, lesduur: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-marine)]">Aantal lessen</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={input.aantalLessen}
                  onChange={(e) => setInput({ ...input, aantalLessen: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
