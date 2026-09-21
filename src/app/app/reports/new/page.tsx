"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  ReportInput,
  GeneratedReport,
  RapportOutputType,
  RapportToon,
} from "@/lib/types";
import { FormCard, PreviewPlaceholder } from "@/components/ui/FormCard";
import { MoreOptions } from "@/components/ui/MoreOptions";
import { StatusBadge } from "@/components/ui/StatusBadge";

const OUTPUT_TYPES: { value: RapportOutputType; label: string }[] = [
  { value: "rapporttekst", label: "Rapporttekst" },
  { value: "oudergesprek", label: "Oudergesprek-verslag" },
  { value: "oudermail", label: "Oudermail-concept" },
];

const TONEN: { value: RapportToon; label: string }[] = [
  { value: "formeel", label: "Formeel" },
  { value: "vriendelijk-direct", label: "Vriendelijk-direct" },
  { value: "warm", label: "Warm" },
];

const DEFAULT_INPUT: ReportInput = {
  leerlingLabel: "",
  aantekeningen: "",
  outputType: "rapporttekst",
  toon: "vriendelijk-direct",
};

export default function NewReportPage() {
  const [input, setInput] = useState<ReportInput>(DEFAULT_INPUT);
  const [resultaat, setResultaat] = useState<GeneratedReport | null>(null);
  const [gekopieerd, setGekopieerd] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.leerlingLabel.trim() || !input.aantekeningen.trim()) return;
    setGekopieerd(false);
    setBezig(true);
    setFout(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Genereren mislukt.");
      }
      const { report } = await response.json();
      setResultaat(report);
    } catch (err) {
      console.error("Rapport genereren mislukt", err);
      setFout(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  async function handleCopy() {
    if (!resultaat) return;
    try {
      await navigator.clipboard.writeText(resultaat.tekst);
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2500);
    } catch (err) {
      console.error("Kopiëren mislukt", err);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="font-display text-3xl text-[var(--color-marine)]">Rapport &amp; communicatie</h1>
        <StatusBadge label="AVG" tone="warning" title="Bevat mogelijk leerlinggegevens — AVG-let-op" />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[420px_1fr]">
        <FormCard onSubmit={handleSubmit} className="h-fit">
          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">Leerling</label>
            <input
              required
              type="text"
              value={input.leerlingLabel}
              onChange={(e) => setInput({ ...input, leerlingLabel: e.target.value })}
              placeholder="L.J. (geen volledige naam)"
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
            />
            {/* AVG-vereiste, harde productregel — altijd zichtbaar, niet uitzetbaar. */}
            <p className="mt-2 text-xs font-medium text-[var(--color-goud)]">
              ⚠ Gebruik geen volledige naam — AVG.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">
              Aantekeningen
            </label>
            <textarea
              required
              rows={6}
              value={input.aantekeningen}
              onChange={(e) => setInput({ ...input, aantekeningen: e.target.value })}
              placeholder="Bijv. doet goed mee, moeite met plannen, sterke mondelinge bijdrage, huiswerk 2x niet af"
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--color-marine)]"
            />
          </div>

          <button
            type="submit"
            disabled={!input.leerlingLabel.trim() || !input.aantekeningen.trim() || bezig}
            className="w-full rounded-full bg-[var(--color-marine)] px-6 py-2.5 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bezig ? "Bezig…" : "Genereer tekst"}
          </button>

          {fout && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{fout}</p>
          )}

          <MoreOptions>
            <div>
              <label className="block text-xs font-medium text-[var(--color-marine)]">Output-type</label>
              <select
                value={input.outputType}
                onChange={(e) => setInput({ ...input, outputType: e.target.value as RapportOutputType })}
                className="mt-1 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
              >
                {OUTPUT_TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-marine)]">Toon</label>
              <select
                value={input.toon}
                onChange={(e) => setInput({ ...input, toon: e.target.value as RapportToon })}
                className="mt-1 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
              >
                {TONEN.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </MoreOptions>

          <p className="text-xs text-[var(--color-inkt)]/50">
            Geen automatische koppeling met Magister/Somtoday —{" "}
            <Link href="/privacy/rapport-module" className="underline underline-offset-4 hover:text-[var(--color-marine)]">
              privacy-uitleg
            </Link>
            .
          </p>
        </FormCard>

        <div>
          {!resultaat && <PreviewPlaceholder>Vul het formulier in om de tekst hier te zien.</PreviewPlaceholder>}
          {resultaat && (
            <article className="space-y-6">
              {!resultaat.guardrail.ok && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  Let op: mogelijk cijfer- of oordeel-taal die niet uit je
                  aantekeningen kwam ({resultaat.guardrail.gevondenWoorden.join(", ")}).
                  Controleer voordat je de tekst gebruikt.
                </div>
              )}
              <div className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-8">
                <h3 className="font-display text-xl text-[var(--color-marine)]">Gegenereerde tekst</h3>
                <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--color-inkt)]">
                  {resultaat.tekst}
                </pre>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full border border-[var(--color-marine)] px-5 py-2.5 text-sm font-medium text-[var(--color-marine)] transition hover:bg-[var(--color-marine)] hover:text-[var(--color-ivoor)]"
                >
                  {gekopieerd ? "Gekopieerd ✓" : "Kopieer naar klembord"}
                </button>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
