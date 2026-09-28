"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TestInput, GeneratedTest, Vak, Niveau } from "@/lib/types";
import { downloadToetsDocx } from "@/lib/docx-export";
import { Button } from "@/components/ui/Button";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { FormCard } from "@/components/ui/FormCard";
import { ProgressNotice } from "@/components/ui/ProgressNotice";
import { Stepper } from "@/components/ui/Stepper";

const VAKKEN: Vak[] = ["Maatschappijleer", "Geschiedenis", "Economie", "Aardrijkskunde"];
const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

/** Zelfde grenzen als de serverside validatie in /api/tests (src/lib/validation.ts). */
const MAX_LEERDOEL = 2000;
const MAX_KERNBEGRIPPEN = 2000;
const MIN_VRAGEN = 1;
const MAX_VRAGEN = 40;
const VASTE_AANTALLEN = [5, 10, 15, 20];

/** Sleutel voor het concept; user-id is client-side niet beschikbaar. */
const CONCEPT_SLEUTEL = "facula-draft-tests";

const DEFAULT_INPUT: TestInput = {
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  leerdoel: "",
  kernbegrippen: "",
  aantalVragen: 10,
};

type FoutVeld = "leerdoel" | "kernbegrippen" | "aantalVragen";
type Fouten = Partial<Record<FoutVeld, string>>;

/** Waar de focus heen moet na "Wijzig" of na een validatiefout. */
type FocusDoel = FoutVeld | "vak" | "niveau" | "leerjaar";

/**
 * Toets-wizard in twee stappen (brief 10), hetzelfde patroon als de
 * les-wizard op /app/lessons/new:
 *
 *   Stap 1  leerdoel + kernbegrippen + vak/niveau, de overige instellingen
 *           als gewone zin met een "Aanpassen"-knop die inline uitklapt.
 *   Stap 2  overzicht in gewone taal, per onderdeel een "Wijzig", daarna
 *           één primaire knop die genereert.
 *
 * Endpoint en request-body blijven ongewijzigd: dezelfde TestInput naar
 * POST /api/tests. Er is nog geen /app/tests/[id]-pagina, dus het
 * resultaat blijft op dit scherm staan, net als voorheen. Bij een fout
 * blijft de invoer staan en kan er direct opnieuw geprobeerd worden.
 */
export default function NewTestPage() {
  const [stap, setStap] = useState<1 | 2>(1);
  const [input, setInput] = useState<TestInput>(DEFAULT_INPUT);
  const [eigenAantal, setEigenAantal] = useState(false);
  const [instellingenOpen, setInstellingenOpen] = useState(false);
  const [fouten, setFouten] = useState<Fouten>({});
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [resultaat, setResultaat] = useState<GeneratedTest | null>(null);
  const [exporteren, setExporteren] = useState(false);
  const [exportFout, setExportFout] = useState<string | null>(null);

  const leerdoelRef = useRef<HTMLTextAreaElement>(null);
  const kernbegrippenRef = useRef<HTMLTextAreaElement>(null);
  const aantalEigenRef = useRef<HTMLInputElement>(null);
  const aantalRef = useRef<HTMLDivElement>(null);
  const leerjaarRef = useRef<HTMLDivElement>(null);
  const vakRef = useRef<HTMLSelectElement>(null);
  const niveauRef = useRef<HTMLSelectElement>(null);
  const conceptGelezen = useRef(false);

  /**
   * Focus naar een veld nádat React de nieuwe stap of het uitgeklapte
   * instellingenblok heeft gerenderd. Bewust in een animatieframe en niet
   * in een effect: een effect zou de focus-state weer moeten opruimen, en
   * setState in een effect veroorzaakt een extra renderronde.
   */
  const focusNaar = useCallback((doel: FocusDoel) => {
    requestAnimationFrame(() => {
      const doelen: Record<FocusDoel, HTMLElement | null> = {
        leerdoel: leerdoelRef.current,
        kernbegrippen: kernbegrippenRef.current,
        aantalVragen:
          aantalEigenRef.current ?? aantalRef.current?.querySelector("input") ?? null,
        leerjaar: leerjaarRef.current?.querySelector("input") ?? null,
        vak: vakRef.current,
        niveau: niveauRef.current,
      };
      doelen[doel]?.focus();
    });
  }, []);

  /**
   * Concept terugzetten: wie per ongeluk wegnavigeert verliest niets. Het
   * lezen gebeurt in een animatieframe en niet in de effect-body, omdat
   * sessionStorage pas op de client bestaat: de server rendert de lege
   * defaults, en een synchrone setState hier zou een extra renderronde
   * kosten tijdens hydratie.
   */
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const opgeslagen = sessionStorage.getItem(CONCEPT_SLEUTEL);
      conceptGelezen.current = true;
      if (!opgeslagen) return;
      try {
        const concept = JSON.parse(opgeslagen) as Partial<TestInput>;
        setInput((huidig) => ({ ...huidig, ...concept }));
        if (
          typeof concept.aantalVragen === "number" &&
          !VASTE_AANTALLEN.includes(concept.aantalVragen)
        ) {
          setEigenAantal(true);
          setInstellingenOpen(true);
        }
      } catch {
        sessionStorage.removeItem(CONCEPT_SLEUTEL);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Pas opslaan nadat het eerder bewaarde concept gelezen is, anders
  // overschrijft de lege beginstaat het concept nog vóór het terugkomt.
  useEffect(() => {
    if (!conceptGelezen.current) return;
    sessionStorage.setItem(CONCEPT_SLEUTEL, JSON.stringify(input));
  }, [input]);

  const wijzig = useCallback(
    (doel: FocusDoel) => {
      if (doel === "aantalVragen" || doel === "leerjaar") {
        setInstellingenOpen(true);
      }
      setStap(1);
      focusNaar(doel);
    },
    [focusNaar]
  );

  function valideer(): Fouten {
    const nieuw: Fouten = {};
    const leerdoel = input.leerdoel.trim();
    if (!leerdoel) {
      nieuw.leerdoel = "Vul een leerdoel in, dan weet Facula waar de toets over gaat.";
    } else if (leerdoel.length > MAX_LEERDOEL) {
      nieuw.leerdoel = `Het leerdoel mag maximaal ${MAX_LEERDOEL} tekens zijn.`;
    }
    if (input.kernbegrippen.trim().length > MAX_KERNBEGRIPPEN) {
      nieuw.kernbegrippen = `De kernbegrippen mogen maximaal ${MAX_KERNBEGRIPPEN} tekens zijn.`;
    }
    if (
      !Number.isInteger(input.aantalVragen) ||
      input.aantalVragen < MIN_VRAGEN ||
      input.aantalVragen > MAX_VRAGEN
    ) {
      nieuw.aantalVragen = `Vul een aantal vragen tussen ${MIN_VRAGEN} en ${MAX_VRAGEN} in.`;
    }
    return nieuw;
  }

  function naarOverzicht(e: React.FormEvent) {
    e.preventDefault();
    const nieuw = valideer();
    setFouten(nieuw);
    const eerste = (["leerdoel", "kernbegrippen", "aantalVragen"] as FoutVeld[]).find(
      (veld) => nieuw[veld]
    );
    if (eerste) {
      if (eerste === "aantalVragen") setInstellingenOpen(true);
      focusNaar(eerste);
      return;
    }
    setStap(2);
  }

  async function genereer() {
    setBezig(true);
    setFout(null);
    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          leerdoel: input.leerdoel.trim(),
          kernbegrippen: input.kernbegrippen.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Genereren mislukt.");
      }
      const { test } = await response.json();
      sessionStorage.removeItem(CONCEPT_SLEUTEL);
      setResultaat(test as GeneratedTest);
    } catch (err) {
      console.error("Toets genereren mislukt", err);
      setFout(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  async function exporteerNaarWord() {
    if (!resultaat) return;
    setExporteren(true);
    setExportFout(null);
    try {
      await downloadToetsDocx(resultaat);
    } catch (err) {
      console.error("Word-export mislukt", err);
      setExportFout("Het downloaden lukte niet. Probeer het opnieuw.");
    } finally {
      setExporteren(false);
    }
  }

  /** Terug naar een leeg formulier voor een volgende toets. */
  function opnieuwBeginnen() {
    setResultaat(null);
    setExportFout(null);
    setInput(DEFAULT_INPUT);
    setEigenAantal(false);
    setInstellingenOpen(false);
    setFouten({});
    setStap(1);
  }

  if (resultaat) {
    return (
      <ToetsResultaat
        toets={resultaat}
        exporteren={exporteren}
        exportFout={exportFout}
        onExport={exporteerNaarWord}
        onOpnieuw={opnieuwBeginnen}
      />
    );
  }

  const samenvatting = `${input.aantalVragen} ${
    input.aantalVragen === 1 ? "vraag" : "vragen"
  }, ${input.niveau} leerjaar ${input.leerjaar}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper
        stap={stap}
        totaal={2}
        titel={stap === 1 ? "Waar gaat de toets over?" : "Klopt dit zo?"}
        terug={stap === 1 ? "/app" : () => setStap(1)}
        terugLabel={stap === 1 ? "Terug naar start" : "Terug naar stap 1"}
      />

      <div key={stap} className="stap-fade">
        {stap === 1 ? (
          <FormCard onSubmit={naarOverzicht} className="mt-8">
            <Field
              label="Leerdoel"
              verplicht
              hulptekst="Schrijf in je eigen woorden wat leerlingen moeten kunnen."
              fout={fouten.leerdoel}
            >
              {(ids) => (
                <>
                  <textarea
                    {...ids}
                    ref={leerdoelRef}
                    rows={7}
                    maxLength={MAX_LEERDOEL}
                    value={input.leerdoel}
                    onChange={(e) => setInput({ ...input, leerdoel: e.target.value })}
                    placeholder="Bijv. Je kunt uitleggen wat de begrippen referentiekader, selectieve waarneming en framing betekenen, en hoe ze samenhangen met maatschappelijke problemen."
                    className={`${VELD_KLASSEN} leading-relaxed`}
                  />
                  <p className="mt-2 text-base text-tekst-zacht">
                    {input.leerdoel.length} van {MAX_LEERDOEL} tekens
                  </p>
                </>
              )}
            </Field>

            <Field
              label="Kernbegrippen"
              hulptekst="Mag je leeg laten. Vul je ze in, dan komen ze zeker in de toets terug. Scheid ze met een komma."
              fout={fouten.kernbegrippen}
            >
              {(ids) => (
                <textarea
                  {...ids}
                  ref={kernbegrippenRef}
                  rows={3}
                  maxLength={MAX_KERNBEGRIPPEN}
                  value={input.kernbegrippen}
                  onChange={(e) => setInput({ ...input, kernbegrippen: e.target.value })}
                  placeholder="Bijv. framing, polarisatie, desinformatie"
                  className={`${VELD_KLASSEN} leading-relaxed`}
                />
              )}
            </Field>

            <Field label="Vak">
              {(ids) => (
                <select
                  {...ids}
                  ref={vakRef}
                  value={input.vak}
                  onChange={(e) => setInput({ ...input, vak: e.target.value as Vak })}
                  className={VELD_KLASSEN}
                >
                  {VAKKEN.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Niveau">
              {(ids) => (
                <select
                  {...ids}
                  ref={niveauRef}
                  value={input.niveau}
                  onChange={(e) =>
                    setInput({ ...input, niveau: e.target.value as Niveau })
                  }
                  className={VELD_KLASSEN}
                >
                  {NIVEAUS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <div className="rounded-xl border-2 border-lijn bg-ivoor p-4">
              <p className="text-base text-tekst">{samenvatting}.</p>
              {!instellingenOpen && (
                <Button
                  variant="ghost"
                  className="mt-2 px-0"
                  onClick={() => setInstellingenOpen(true)}
                >
                  Aanpassen
                </Button>
              )}

              {instellingenOpen && (
                <div className="mt-4 space-y-6">
                  <div ref={aantalRef}>
                    <ChoiceCards<number | "anders">
                      legend="Aantal vragen"
                      keuzes={[
                        ...VASTE_AANTALLEN.map((n) => ({
                          waarde: n as number | "anders",
                          label: `${n} vragen`,
                        })),
                        { waarde: "anders" as const, label: "Anders" },
                      ]}
                      waarde={eigenAantal ? "anders" : input.aantalVragen}
                      onChange={(waarde) => {
                        if (waarde === "anders") {
                          setEigenAantal(true);
                          return;
                        }
                        setEigenAantal(false);
                        setInput({ ...input, aantalVragen: waarde });
                        setFouten({ ...fouten, aantalVragen: undefined });
                      }}
                      kolommen={3}
                    />
                  </div>

                  {eigenAantal && (
                    <Field
                      label="Aantal vragen"
                      hulptekst={`Tussen ${MIN_VRAGEN} en ${MAX_VRAGEN} vragen.`}
                      fout={fouten.aantalVragen}
                    >
                      {(ids) => (
                        <input
                          {...ids}
                          ref={aantalEigenRef}
                          type="number"
                          inputMode="numeric"
                          min={MIN_VRAGEN}
                          max={MAX_VRAGEN}
                          value={input.aantalVragen}
                          onChange={(e) =>
                            setInput({ ...input, aantalVragen: Number(e.target.value) })
                          }
                          className={VELD_KLASSEN}
                        />
                      )}
                    </Field>
                  )}

                  <div ref={leerjaarRef}>
                    <ChoiceCards<number>
                      legend="Leerjaar"
                      keuzes={[1, 2, 3, 4, 5, 6].map((n) => ({
                        waarde: n,
                        label: String(n),
                      }))}
                      waarde={input.leerjaar}
                      onChange={(waarde) => setInput({ ...input, leerjaar: waarde })}
                      kolommen={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" variant="primary" volleBreedte>
              Volgende
            </Button>
          </FormCard>

        ) : (
          <div className="mt-8 space-y-6 rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
            <dl className="space-y-4">
              <OverzichtRegel
                label="Leerdoel"
                waarde={input.leerdoel.trim()}
                onWijzig={() => wijzig("leerdoel")}
              />
              <OverzichtRegel
                label="Kernbegrippen"
                waarde={input.kernbegrippen.trim() || "Geen, Facula kiest ze zelf"}
                onWijzig={() => wijzig("kernbegrippen")}
              />
              <OverzichtRegel
                label="Vak"
                waarde={input.vak}
                onWijzig={() => wijzig("vak")}
              />
              <OverzichtRegel
                label="Niveau en leerjaar"
                waarde={`${input.niveau}, leerjaar ${input.leerjaar}`}
                onWijzig={() => wijzig("leerjaar")}
              />
              <OverzichtRegel
                label="Aantal vragen"
                waarde={`${input.aantalVragen} ${
                  input.aantalVragen === 1 ? "vraag" : "vragen"
                }`}
                onWijzig={() => wijzig("aantalVragen")}
              />
            </dl>

            <ProgressNotice bezig={bezig} />

            {fout && (
              <div className="rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4">
                <p className="text-base font-medium text-fout-tekst">{fout}</p>
                <p className="mt-1 text-base text-tekst-zacht">
                  Je invoer staat er nog. Je kunt het direct opnieuw proberen.
                </p>
              </div>
            )}

            <Button variant="primary" volleBreedte disabled={bezig} onClick={genereer}>
              {bezig ? "Bezig met maken..." : fout ? "Probeer opnieuw" : "Maak de toets"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Eén regel in het overzicht: label, gekozen waarde, en "Wijzig". */
function OverzichtRegel({
  label,
  waarde,
  onWijzig,
}: {
  label: string;
  waarde: string;
  onWijzig: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b-2 border-lijn pb-4 last:border-b-0 last:pb-0">
      <div className="min-w-0 basis-full sm:basis-auto">
        <dt className="text-base font-semibold text-marine">{label}</dt>
        <dd className="mt-1 break-words text-base text-tekst">{waarde}</dd>
      </div>
      <Button variant="ghost" className="px-0" onClick={onWijzig}>
        Wijzig
        <span className="sr-only"> {label}</span>
      </Button>
    </div>
  );
}

/**
 * De gemaakte toets. Er is nog geen /app/tests/[id]-pagina, dus het
 * resultaat blijft hier staan: de vragen, de antwoorden eronder, en één
 * primaire actie (downloaden).
 */
function ToetsResultaat({
  toets,
  exporteren,
  exportFout,
  onExport,
  onOpnieuw,
}: {
  toets: GeneratedTest;
  exporteren: boolean;
  exportFout: string | null;
  onExport: () => void;
  onOpnieuw: () => void;
}) {
  return (
    <div className="stap-fade mx-auto max-w-3xl">
      <article className="space-y-8">
        {/* `op-donker` zet de tekstkleur om én draait de focusring om, zodat
            de kop op marine ruim boven de contrasteis blijft. */}
        <header className="op-donker rounded-2xl border-2 border-marine bg-marine p-8">
          <p className="text-base font-semibold uppercase tracking-[0.2em] text-op-donker-zacht">
            {toets.input.vak} · {toets.input.niveau} {toets.input.leerjaar}
          </p>
          <h1 className="mt-3 font-display text-3xl">{toets.titel}</h1>
          <p className="mt-3 text-base text-op-donker-zacht">
            {toets.vragen.length} vragen · {toets.totaalPunten} punten · circa{" "}
            {toets.tijdsduur} minuten
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={onExport} disabled={exporteren}>
            {exporteren ? "Bezig met downloaden..." : "Download als Word"}
          </Button>
          <Button variant="secondary" onClick={onOpnieuw}>
            Nog een toets maken
          </Button>
        </div>

        {exportFout && (
          <div className="rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4">
            <p className="text-base font-medium text-fout-tekst">{exportFout}</p>
          </div>
        )}

        <div className="rounded-2xl border-2 border-lijn bg-ivoor p-8">
          <h2 className="font-display text-2xl text-marine">De vragen</h2>
          <ol className="mt-6 space-y-8">
            {toets.vragen.map((v) => (
              <li key={v.nummer}>
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <p className="text-base font-medium text-tekst">
                    {v.nummer}. {v.vraag}
                  </p>
                  <span className="shrink-0 text-base text-tekst-zacht">
                    {v.punten} {v.punten === 1 ? "punt" : "punten"} ·{" "}
                    {v.type === "meerkeuze"
                      ? "meerkeuze"
                      : v.type === "open"
                        ? "open vraag"
                        : "invulvraag"}
                  </span>
                </div>
                {v.opties && (
                  <ul className="mt-2 space-y-1 pl-4 text-base text-tekst">
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

        <div className="rounded-2xl border-2 border-lijn bg-ivoor-deep p-8">
          <h2 className="font-display text-2xl text-marine">De antwoorden</h2>
          <ol className="mt-6 space-y-3">
            {toets.vragen.map((v) => (
              <li key={v.nummer} className="text-base text-tekst">
                <span className="font-semibold text-succes-tekst">{v.nummer}.</span>{" "}
                {v.antwoordsleutel}
              </li>
            ))}
          </ol>
        </div>
      </article>
    </div>
  );
}
