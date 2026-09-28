"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  ReportInput,
  GeneratedReport,
  RapportOutputType,
  RapportToon,
} from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { FormCard } from "@/components/ui/FormCard";
import { ProgressNotice } from "@/components/ui/ProgressNotice";
import { Stepper } from "@/components/ui/Stepper";

const OUTPUT_TYPES: {
  waarde: RapportOutputType;
  label: string;
  toelichting: string;
}[] = [
  {
    waarde: "rapporttekst",
    label: "Rapporttekst",
    toelichting: "Korte tekst voor het rapport zelf.",
  },
  {
    waarde: "oudergesprek",
    label: "Oudergesprek-verslag",
    toelichting: "Verslag om het gesprek mee voor te bereiden.",
  },
  {
    waarde: "oudermail",
    label: "Oudermail-concept",
    toelichting: "Concept-mail die je zelf nog nakijkt.",
  },
];

const TONEN: { waarde: RapportToon; label: string }[] = [
  { waarde: "formeel", label: "Formeel" },
  { waarde: "vriendelijk-direct", label: "Vriendelijk-direct" },
  { waarde: "warm", label: "Warm" },
];

/** Zelfde grenzen als de serverside validatie in /api/reports (limitString). */
const MAX_LEERLING = 2000;
const MAX_AANTEKENINGEN = 2000;

/** Sleutel voor het concept; user-id is client-side niet beschikbaar. */
const CONCEPT_SLEUTEL = "facula-draft-reports";

const DEFAULT_INPUT: ReportInput = {
  leerlingLabel: "",
  aantekeningen: "",
  outputType: "rapporttekst",
  toon: "vriendelijk-direct",
};

type FoutVeld = "leerlingLabel" | "aantekeningen";
type Fouten = Partial<Record<FoutVeld, string>>;

/** Waar de focus heen moet na "Wijzig" of na een validatiefout. */
type FocusDoel = FoutVeld | "outputType" | "toon";

const OUTPUT_LABEL: Record<RapportOutputType, string> = {
  rapporttekst: "rapporttekst",
  oudergesprek: "oudergesprek-verslag",
  oudermail: "oudermail-concept",
};

const TOON_LABEL: Record<RapportToon, string> = {
  formeel: "formele",
  "vriendelijk-direct": "vriendelijk-directe",
  warm: "warme",
};

/**
 * Rapport-wizard in twee stappen (brief 10), zelfde patroon als de
 * les-wizard:
 *
 *   Stap 1  leerling-label + aantekeningen, de overige instellingen
 *           (soort tekst en toon) als gewone zin met een "Aanpassen"-knop
 *           die inline uitklapt.
 *   Stap 2  overzicht in gewone taal, per onderdeel een "Wijzig", daarna
 *           één primaire knop die de tekst schrijft.
 *
 * Endpoint en request-body zijn ongewijzigd: dezelfde ReportInput naar
 * POST /api/reports. Bij een fout blijft de invoer staan en kan het op
 * hetzelfde scherm direct opnieuw.
 */
export default function NewReportPage() {
  const [stap, setStap] = useState<1 | 2>(1);
  const [input, setInput] = useState<ReportInput>(DEFAULT_INPUT);
  const [instellingenOpen, setInstellingenOpen] = useState(false);
  const [fouten, setFouten] = useState<Fouten>({});
  const [resultaat, setResultaat] = useState<GeneratedReport | null>(null);
  const [gekopieerd, setGekopieerd] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const leerlingRef = useRef<HTMLInputElement>(null);
  const aantekeningenRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const toonRef = useRef<HTMLDivElement>(null);
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
        leerlingLabel: leerlingRef.current,
        aantekeningen: aantekeningenRef.current,
        outputType: outputRef.current?.querySelector("input") ?? null,
        toon: toonRef.current?.querySelector("input") ?? null,
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
        const concept = JSON.parse(opgeslagen) as Partial<ReportInput>;
        setInput((huidig) => ({ ...huidig, ...concept }));
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
      if (doel === "outputType" || doel === "toon") setInstellingenOpen(true);
      setStap(1);
      focusNaar(doel);
    },
    [focusNaar]
  );

  function valideer(): Fouten {
    const nieuw: Fouten = {};
    const label = input.leerlingLabel.trim();
    const aantekeningen = input.aantekeningen.trim();
    if (!label) {
      nieuw.leerlingLabel =
        "Vul een voornaam of pseudoniem in, dan weet je later over wie de tekst ging.";
    } else if (label.length > MAX_LEERLING) {
      nieuw.leerlingLabel = `Dit veld mag maximaal ${MAX_LEERLING} tekens zijn.`;
    }
    if (!aantekeningen) {
      nieuw.aantekeningen =
        "Vul je aantekeningen in, dat is waar Facula de tekst op baseert.";
    } else if (aantekeningen.length > MAX_AANTEKENINGEN) {
      nieuw.aantekeningen = `De aantekeningen mogen maximaal ${MAX_AANTEKENINGEN} tekens zijn.`;
    }
    return nieuw;
  }

  function naarOverzicht(e: React.FormEvent) {
    e.preventDefault();
    const nieuw = valideer();
    setFouten(nieuw);
    const eerste = (["leerlingLabel", "aantekeningen"] as FoutVeld[]).find(
      (veld) => nieuw[veld]
    );
    if (eerste) {
      focusNaar(eerste);
      return;
    }
    setStap(2);
  }

  async function genereer() {
    setGekopieerd(false);
    setBezig(true);
    setFout(null);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          leerlingLabel: input.leerlingLabel.trim(),
          aantekeningen: input.aantekeningen.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Genereren mislukt.");
      }
      const { report } = await response.json();
      sessionStorage.removeItem(CONCEPT_SLEUTEL);
      conceptGelezen.current = false;
      setResultaat(report as GeneratedReport);
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

  if (resultaat) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/app"
          className="inline-flex min-h-14 items-center gap-2 text-base font-medium text-marine underline underline-offset-4"
        >
          <span aria-hidden>←</span>
          Terug naar start
        </Link>
        <h1 className="mt-1 font-display text-3xl text-marine">De tekst is klaar</h1>

        <div className="mt-8 space-y-6">
          {!resultaat.guardrail.ok && (
            <div className="rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4">
              <p className="text-base font-medium text-fout-tekst">
                Let op: hier staat mogelijk cijfer- of oordeel-taal die niet uit je
                aantekeningen kwam ({resultaat.guardrail.gevondenWoorden.join(", ")}).
              </p>
              <p className="mt-1 text-base text-tekst-zacht">
                Lees de tekst na voordat je hem gebruikt.
              </p>
            </div>
          )}

          <article className="rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
            <h2 className="font-display text-xl text-marine">
              {OUTPUT_LABEL[resultaat.input.outputType]} voor{" "}
              {resultaat.input.leerlingLabel}
            </h2>
            <pre className="mt-4 whitespace-pre-wrap font-sans text-base leading-relaxed text-tekst">
              {resultaat.tekst}
            </pre>
          </article>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={handleCopy}>
              {gekopieerd ? "Gekopieerd ✓" : "Kopieer de tekst"}
            </Button>
            <Button
              onClick={() => {
                setResultaat(null);
                setStap(1);
                conceptGelezen.current = true;
                focusNaar("aantekeningen");
              }}
            >
              Nog een tekst schrijven
            </Button>
          </div>

          <p className="text-base text-tekst-zacht">
            Geen automatische koppeling met Magister of Somtoday.{" "}
            <Link
              href="/privacy/rapport-module"
              className="font-semibold text-marine underline underline-offset-4"
            >
              privacy-uitleg
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const samenvatting = `Een ${TOON_LABEL[input.toon]} ${OUTPUT_LABEL[input.outputType]}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper
        stap={stap}
        totaal={2}
        titel={stap === 1 ? "Over wie gaat de tekst?" : "Klopt dit zo?"}
        terug={stap === 1 ? "/app" : () => setStap(1)}
        terugLabel={stap === 1 ? "Terug naar start" : "Terug naar stap 1"}
      />

      <div key={stap} className="stap-fade">
        {stap === 1 ? (
          <FormCard onSubmit={naarOverzicht} className="mt-8">
            {/* AVG-vereiste, harde productregel: altijd zichtbaar, niet
                inklapbaar en niet uitzetbaar. Staat bewust bóven de
                naamvelden, want erna gelezen is te laat. Goud haalde hier
                2,65:1, het waarschuwing-paar 10,43:1. */}
            <p className="flex gap-2 rounded-lg bg-waarschuwing-vlak px-4 py-3 text-base font-semibold text-waarschuwing-tekst">
              <span aria-hidden>⚠</span>
              <span>
                Gebruik een voornaam of een pseudoniem, dat vraagt de AVG. Geen
                achternaam, geen BSN, en geen gegevens over gezondheid, geloof of
                afkomst.
              </span>
            </p>

            <Field
              label="Leerling"
              verplicht
              hulptekst="Bijvoorbeeld Sanne, of L.J. Alleen voor jezelf, om de tekst terug te vinden."
              fout={fouten.leerlingLabel}
            >
              {(ids) => (
                <input
                  {...ids}
                  ref={leerlingRef}
                  type="text"
                  autoComplete="off"
                  maxLength={MAX_LEERLING}
                  value={input.leerlingLabel}
                  onChange={(e) =>
                    setInput({ ...input, leerlingLabel: e.target.value })
                  }
                  placeholder="Sanne"
                  className={VELD_KLASSEN}
                />
              )}
            </Field>

            <Field
              label="Aantekeningen"
              verplicht
              hulptekst="Schrijf in steekwoorden wat je hebt gezien. Facula schrijft er de tekst van en verzint er niets bij."
              fout={fouten.aantekeningen}
            >
              {(ids) => (
                <>
                  <textarea
                    {...ids}
                    ref={aantekeningenRef}
                    rows={7}
                    maxLength={MAX_AANTEKENINGEN}
                    value={input.aantekeningen}
                    onChange={(e) =>
                      setInput({ ...input, aantekeningen: e.target.value })
                    }
                    placeholder="Bijv. doet goed mee, moeite met plannen, sterke mondelinge bijdrage, huiswerk 2x niet af"
                    className={`${VELD_KLASSEN} leading-relaxed`}
                  />
                  <p className="mt-2 text-base text-tekst-zacht">
                    {input.aantekeningen.length} van {MAX_AANTEKENINGEN} tekens
                  </p>
                </>
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
                  <div ref={outputRef}>
                    <ChoiceCards<RapportOutputType>
                      legend="Wat moet Facula schrijven?"
                      keuzes={OUTPUT_TYPES}
                      waarde={input.outputType}
                      onChange={(waarde) => setInput({ ...input, outputType: waarde })}
                    />
                  </div>

                  <div ref={toonRef}>
                    <ChoiceCards<RapportToon>
                      legend="Toon"
                      hulptekst="Je kunt de tekst daarna nog zelf bijschaven."
                      keuzes={TONEN}
                      waarde={input.toon}
                      onChange={(waarde) => setInput({ ...input, toon: waarde })}
                      kolommen={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" variant="primary" volleBreedte>
              Volgende
            </Button>

            <p className="text-base text-tekst-zacht">
              Geen automatische koppeling met Magister of Somtoday.{" "}
              <Link
                href="/privacy/rapport-module"
                className="font-semibold text-marine underline underline-offset-4"
              >
                privacy-uitleg
              </Link>
              .
            </p>
          </FormCard>
        ) : (
          <div className="mt-8 space-y-6 rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
            <dl className="space-y-4">
              <OverzichtRegel
                label="Leerling"
                waarde={input.leerlingLabel.trim()}
                onWijzig={() => wijzig("leerlingLabel")}
              />
              <OverzichtRegel
                label="Aantekeningen"
                waarde={input.aantekeningen.trim()}
                onWijzig={() => wijzig("aantekeningen")}
              />
              <OverzichtRegel
                label="Soort tekst"
                waarde={OUTPUT_LABEL[input.outputType]}
                onWijzig={() => wijzig("outputType")}
              />
              <OverzichtRegel
                label="Toon"
                waarde={TONEN.find((t) => t.waarde === input.toon)?.label ?? input.toon}
                onWijzig={() => wijzig("toon")}
              />
            </dl>

            <ProgressNotice bezig={bezig} tekst="Bezig met schrijven..." />

            {fout && (
              <div className="rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4">
                <p className="text-base font-medium text-fout-tekst">{fout}</p>
                <p className="mt-1 text-base text-tekst-zacht">
                  Je invoer staat er nog. Je kunt het direct opnieuw proberen.
                </p>
              </div>
            )}

            <Button variant="primary" volleBreedte disabled={bezig} onClick={genereer}>
              {bezig
                ? "Bezig met schrijven..."
                : fout
                  ? "Probeer opnieuw"
                  : "Schrijf het rapport"}
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
        <dd className="mt-1 break-words whitespace-pre-wrap text-base text-tekst">
          {waarde}
        </dd>
      </div>
      <Button variant="ghost" className="px-0" onClick={onWijzig}>
        Wijzig
        <span className="sr-only"> {label}</span>
      </Button>
    </div>
  );
}
