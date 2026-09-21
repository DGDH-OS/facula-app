"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  ReportInput,
  GeneratedReport,
  RapportOutputType,
  RapportToon,
} from "@/lib/types";
import { genereerRapportTekst } from "@/lib/report-generator";

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.leerlingLabel.trim() || !input.aantekeningen.trim()) return;
    setGekopieerd(false);
    setResultaat(genereerRapportTekst(input));
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
        <h1 className="font-display text-3xl text-[var(--color-marine)]">
          Rapport &amp; oudercommunicatie
        </h1>
        <span className="rounded-full bg-[var(--color-goud)]/15 px-2.5 py-1 text-xs font-medium text-[var(--color-goud)]">
          Bevat mogelijk leerlinggegevens — AVG-let-op
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-inkt)]/70">
        Typ losse aantekeningen of steekwoorden over een leerling — Facula
        stelt hier een vloeiende, professionele tekst van samen die je zelf
        overplakt in Magister, Somtoday of je mail. Er is bewust géén
        automatische koppeling met een schoolsysteem.
      </p>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-inkt)]/70">
        Meer over hoe we hierbij met persoonsgegevens omgaan:{" "}
        <Link
          href="/privacy/rapport-module"
          className="underline underline-offset-4 hover:text-[var(--color-marine)]"
        >
          lees de uitleg
        </Link>
        .
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit space-y-5 rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6"
        >
          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">
              Leerling (bijv. initialen zoals &quot;L.J.&quot; i.p.v.
              volledige naam)
            </label>
            <input
              required
              type="text"
              value={input.leerlingLabel}
              onChange={(e) =>
                setInput({ ...input, leerlingLabel: e.target.value })
              }
              placeholder="L.J."
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
            />
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-inkt)]/60">
              Gebruik bij voorkeur geen volledige naam. Voor een goede,
              vloeiende tekst is een naam niet nodig — pseudonimiseren
              (bijv. initialen of &quot;de leerling&quot;) beperkt hoeveel
              persoonsgegevens hier worden verwerkt, in lijn met de AVG.
              Deze tekst blijft altijd zichtbaar, dit is geen keuze die je
              kunt uitzetten.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">
              Output-type
            </label>
            <select
              value={input.outputType}
              onChange={(e) =>
                setInput({
                  ...input,
                  outputType: e.target.value as RapportOutputType,
                })
              }
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
            >
              {OUTPUT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">
              Toon / register
            </label>
            <select
              value={input.toon}
              onChange={(e) =>
                setInput({ ...input, toon: e.target.value as RapportToon })
              }
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
            >
              {TONEN.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">
              Aantekeningen / steekwoorden
            </label>
            <textarea
              required
              rows={6}
              value={input.aantekeningen}
              onChange={(e) =>
                setInput({ ...input, aantekeningen: e.target.value })
              }
              placeholder="Bijv. doet goed mee, moeite met plannen, sterke mondelinge bijdrage, huiswerk 2x niet af"
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--color-marine)]"
            />
            <p className="mt-1 text-xs text-[var(--color-inkt)]/50">
              Facula herformuleert alleen wat je hier zelf invult — er wordt
              nooit automatisch een cijfer, oordeel of advies over
              overgaan/zakken toegevoegd.
            </p>
          </div>

          <button
            type="submit"
            disabled={!input.leerlingLabel.trim() || !input.aantekeningen.trim()}
            className="w-full rounded-full bg-[var(--color-marine)] px-6 py-2.5 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Genereer tekst
          </button>
        </form>

        <div>
          {!resultaat && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-lijn)] text-sm text-[var(--color-inkt)]/50">
              Vul het formulier in en klik op &quot;Genereer tekst&quot; om de
              output hier te zien.
            </div>
          )}
          {resultaat && (
            <article className="space-y-6">
              {!resultaat.guardrail.ok && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  Let op: deze tekst bevat mogelijk evaluatieve of
                  cijfermatige taal die niet letterlijk uit je aantekeningen
                  kwam ({resultaat.guardrail.gevondenWoorden.join(", ")}).
                  Controleer en pas de tekst aan voordat je hem gebruikt.
                </div>
              )}
              <div className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-8">
                <h3 className="font-display text-xl text-[var(--color-marine)]">
                  Gegenereerde tekst
                </h3>
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
                <span className="text-xs text-[var(--color-inkt)]/50">
                  Plak dit zelf over in Magister, Somtoday of je mail — er is
                  geen automatische export.
                </span>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
