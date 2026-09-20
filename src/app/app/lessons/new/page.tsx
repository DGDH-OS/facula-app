"use client";

import { useState } from "react";
import type { LessonInput, GeneratedLesson, Vak, Niveau } from "@/lib/types";
import { genereerLes } from "@/lib/lesson-generator";

const VAKKEN: Vak[] = ["Maatschappijleer", "Geschiedenis", "Economie", "Aardrijkskunde"];
const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

const DEMO_LEERDOEL =
  "Je kunt opnoemen en uitleggen wat de begrippen referentiekader, selectieve waarneming, desinformatie, manipulatie, polarisatie, framing betekenen, en je kunt uitleggen wat deze begrippen te maken hebben met maatschappelijke problemen.";

export default function NewLessonPage() {
  const [input, setInput] = useState<LessonInput>({
    vak: "Maatschappijleer",
    niveau: "havo",
    leerjaar: 4,
    leerdoel: DEMO_LEERDOEL,
    lesduur: 50,
    aantalLessen: 2,
  });
  const [resultaat, setResultaat] = useState<GeneratedLesson | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResultaat(genereerLes(input));
  }

  function laadVoorbeeld() {
    setInput({
      vak: "Maatschappijleer",
      niveau: "havo",
      leerjaar: 4,
      leerdoel: DEMO_LEERDOEL,
      lesduur: 50,
      aantalLessen: 2,
    });
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-[var(--color-marine)]">Nieuwe les genereren</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--color-inkt)]/70">
        Vul het leerdoel in — Facula vult automatisch kernbegrippen, casus,
        uitgewerkt voorbeeld, opdracht, bespreking en huiswerk in volgens het
        vaste lesformat.
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
              <label className="block text-sm font-medium text-[var(--color-marine)]">Lesduur (min)</label>
              <input
                type="number"
                min={20}
                max={120}
                step={5}
                value={input.lesduur}
                onChange={(e) => setInput({ ...input, lesduur: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">Aantal lessen</label>
            <input
              type="number"
              min={1}
              max={6}
              value={input.aantalLessen}
              onChange={(e) => setInput({ ...input, aantalLessen: Number(e.target.value) })}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
            />
            <p className="mt-1 text-xs text-[var(--color-inkt)]/50">
              De kernbegrippen uit het leerdoel worden verdeeld over dit aantal lessen.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-marine)]">Leerdoel</label>
            <textarea
              required
              rows={5}
              value={input.leerdoel}
              onChange={(e) => setInput({ ...input, leerdoel: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor)] px-3 py-2 text-sm outline-none focus:border-[var(--color-marine)]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-[var(--color-marine)] px-6 py-2.5 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
            >
              Genereer les
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
              Vul het formulier in en klik op &quot;Genereer les&quot; om de output hier te zien.
            </div>
          )}
          {resultaat && (
            <article className="space-y-10">
              <header className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-marine)] p-8 text-[var(--color-ivoor)]">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-goud)]">
                  {resultaat.input.vak} · {resultaat.input.niveau} {resultaat.input.leerjaar} ·{" "}
                  {resultaat.input.aantalLessen}× {resultaat.input.lesduur} min
                </p>
                <h2 className="mt-3 font-display text-2xl">{resultaat.titel}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {resultaat.kernbegrippen.map((b) => (
                    <span
                      key={b}
                      className="rounded-full bg-[var(--color-ivoor)]/10 px-3 py-1 text-xs"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </header>

              {resultaat.onderdelen.map((deel) => (
                <div key={deel.nummer} className="rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor)] p-8">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-display text-xl text-[var(--color-marine)]">{deel.titel}</h3>
                    <span className="text-xs text-[var(--color-inkt)]/50">{deel.duur} minuten</span>
                  </div>
                  <div className="mt-6 space-y-6">
                    {deel.secties.map((sectie) => (
                      <div key={sectie.titel}>
                        <div className="flex items-baseline justify-between">
                          <h4 className="text-sm font-semibold text-[var(--color-groen)]">{sectie.titel}</h4>
                          {sectie.duur ? (
                            <span className="text-xs text-[var(--color-inkt)]/40">{sectie.duur} min</span>
                          ) : null}
                        </div>
                        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-[var(--color-inkt)]/80">
                          {sectie.inhoud.map((regel, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-[var(--color-goud)]">—</span>
                              <span>{regel}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled
                  title="Demo-omgeving: export is een mockup, geen echt bestand"
                  className="cursor-not-allowed rounded-full border border-[var(--color-marine)]/30 px-5 py-2.5 text-sm font-medium text-[var(--color-marine)]/60"
                >
                  Exporteer naar PowerPoint (demo)
                </button>
                <a
                  href="/app/tests/new"
                  className="rounded-full bg-[var(--color-marine)] px-5 py-2.5 text-sm font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
                >
                  Genereer bijpassende toets →
                </a>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
