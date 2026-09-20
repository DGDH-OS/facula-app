"use client";

import { useState } from "react";
import type { TestInput, GeneratedTest, Vak, Niveau } from "@/lib/types";
import { genereerToets } from "@/lib/test-generator";
import { downloadToetsDocx } from "@/lib/docx-export";

const VAKKEN: Vak[] = ["Maatschappijleer", "Geschiedenis", "Economie", "Aardrijkskunde"];
const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

const DEMO_LEERDOEL =
  "Je kunt opnoemen en uitleggen wat de begrippen referentiekader, selectieve waarneming, desinformatie, manipulatie, polarisatie, framing betekenen, en je kunt uitleggen wat deze begrippen te maken hebben met maatschappelijke problemen.";
const DEMO_BEGRIPPEN =
  "referentiekader, selectieve waarneming, desinformatie, manipulatie, polarisatie, framing";

export default function NewTestPage() {
  const [input, setInput] = useState<TestInput>({
    vak: "Maatschappijleer",
    niveau: "havo",
    leerjaar: 4,
    leerdoel: DEMO_LEERDOEL,
    kernbegrippen: DEMO_BEGRIPPEN,
    aantalVragen: 8,
  });
  const [resultaat, setResultaat] = useState<GeneratedTest | null>(null);
  const [exporteren, setExporteren] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResultaat(genereerToets(input));
  }

  async function handleExport() {
    if (!resultaat) return;
    setExporteren(true);
    try {
      await downloadToetsDocx(resultaat);
    } catch (err) {
      console.error("Word-export mislukt", err);
      alert("Er ging iets mis bij het genereren van het Word-document. Probeer het opnieuw.");
    } finally {
      setExporteren(false);
    }
  }

  function laadVoorbeeld() {
    setInput({
      vak: "Maatschappijleer",
      niveau: "havo",
      leerjaar: 4,
      leerdoel: DEMO_LEERDOEL,
      kernbegrippen: DEMO_BEGRIPPEN,
      aantalVragen: 8,
    });
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--color-marine)]">Nieuwe toets genereren</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--color-inkt)]/70">
        Vul leerdoel en kernbegrippen in — Facula genereert een toets met
        meerkeuze-, open en invulvragen, inclusief antwoordsleutel.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="h-fit space-y-5 rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-marine)]">Vak</label>
              <select
                value={input.vak}
                onChange={(e) => setInput({ ...input, vak: e.target.value as Vak })}
                className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
              >
                {VAKKEN.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-marine)]">Niveau</label>
              <select
                value={input.niveau}
                onChange={(e) => setInput({ ...input, niveau: e.target.value as Niveau })}
                className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
              >
                {NIVEAUS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-marine)]">Leerjaar</label>
              <input
                type="number"
                min={1}
                max={6}
                value={input.leerjaar}
                onChange={(e) => setInput({ ...input, leerjaar: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-marine)]">Aantal vragen</label>
              <input
                type="number"
                min={3}
                max={20}
                value={input.aantalVragen}
                onChange={(e) => setInput({ ...input, aantalVragen: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">Leerdoel</label>
            <textarea
              required
              rows={4}
              value={input.leerdoel}
              onChange={(e) => setInput({ ...input, leerdoel: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">
              Kernbegrippen (komma-gescheiden)
            </label>
            <textarea
              rows={2}
              value={input.kernbegrippen}
              onChange={(e) => setInput({ ...input, kernbegrippen: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
            />
            <p className="mt-1 text-xs text-[var(--color-inkt)]/50">
              Optioneel — wordt aangevuld met begrippen die uit het leerdoel worden herkend.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-[var(--color-marine)] px-6 py-2.5 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
            >
              Genereer toets
            </button>
            <button
              type="button"
              onClick={laadVoorbeeld}
              className="text-xs text-[var(--color-inkt)]/60 underline underline-offset-4 hover:text-[var(--color-marine)]"
            >
              Laad Mihiriban-voorbeeld
            </button>
          </div>
        </form>

        <div>
          {!resultaat && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-lijn)] text-sm text-[var(--color-inkt)]/50">
              Vul het formulier in en klik op &quot;Genereer toets&quot; om de output hier te zien.
            </div>
          )}
          {resultaat && (
            <article className="space-y-8">
              <header className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-marine)] p-8 text-[var(--color-ivoor)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-goud)]">
                  {resultaat.input.vak} · {resultaat.input.niveau} {resultaat.input.leerjaar}
                </p>
                <h2 className="mt-3 font-display text-2xl">{resultaat.titel}</h2>
                <p className="mt-3 text-sm text-[var(--color-ivoor)]/75">
                  {resultaat.vragen.length} vragen · {resultaat.totaalPunten} punten totaal · circa{" "}
                  {resultaat.tijdsduur} minuten
                </p>
              </header>

              <div className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor)] p-8">
                <h3 className="font-display text-xl text-[var(--color-marine)]">Toets</h3>
                <ol className="mt-6 space-y-8">
                  {resultaat.vragen.map((v) => (
                    <li key={v.nummer}>
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-sm font-medium text-[var(--color-inkt)]">
                          {v.nummer}. {v.vraag}
                        </p>
                        <span className="shrink-0 text-xs text-[var(--color-inkt)]/40">
                          {v.punten} {v.punten === 1 ? "punt" : "punten"} ·{" "}
                          {v.type === "meerkeuze" ? "meerkeuze" : v.type === "open" ? "open vraag" : "invulvraag"}
                        </span>
                      </div>
                      {v.opties && (
                        <ul className="mt-2 space-y-1 pl-4 text-sm text-[var(--color-inkt)]/75">
                          {v.opties.map((o) => (
                            <li key={o.label}>
                              {o.label}. {o.tekst}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-8">
                <h3 className="font-display text-xl text-[var(--color-marine)]">Antwoordsleutel</h3>
                <ol className="mt-6 space-y-3">
                  {resultaat.vragen.map((v) => (
                    <li key={v.nummer} className="text-sm text-[var(--color-inkt)]/80">
                      <span className="font-medium text-[var(--color-groen)]">{v.nummer}.</span>{" "}
                      {v.antwoordsleutel}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporteren}
                  className="rounded-full border border-[var(--color-marine)] px-5 py-2.5 text-sm font-medium text-[var(--color-marine)] transition hover:bg-[var(--color-marine)] hover:text-[var(--color-ivoor)] disabled:cursor-wait disabled:opacity-60"
                >
                  {exporteren ? "Bezig met genereren…" : "Exporteer naar Word"}
                </button>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
