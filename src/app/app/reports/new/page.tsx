"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReportInput, RapportOutputType, RapportToon, RapportPeriode, RapportNiveau, RapportAanspreekvorm, RapportLengte } from "@/lib/types";
import { controleerRapportKwaliteit, RAPPORT_ZINNENBANK } from "@/lib/report-quality";
import { conceptKeuze, useDraft } from "@/lib/useDraft";
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
const PERIODES: { waarde: RapportPeriode; label: string }[] = [{ waarde: "rapport-1", label: "Rapport 1" }, { waarde: "rapport-2", label: "Rapport 2" }, { waarde: "rapport-3", label: "Rapport 3" }, { waarde: "eindrapport", label: "Eindrapport" }];
const NIVEAUS: { waarde: RapportNiveau; label: string }[] = [{ waarde: "po", label: "PO groep 1-8" }, { waarde: "vmbo", label: "VO vmbo" }, { waarde: "havo", label: "VO havo" }, { waarde: "vwo", label: "VO vwo" }];
const LENGTES: { waarde: RapportLengte; label: string }[] = [{ waarde: "kort", label: "Kort" }, { waarde: "normaal", label: "Normaal" }, { waarde: "uitgebreid", label: "Uitgebreid" }];

/** Zelfde grenzen als de serverside validatie in /api/reports (limitString). */
const MAX_LEERLING = 2000;
const MAX_AANTEKENINGEN = 2000;

/*
 * AVG: het leerling-label en de aantekeningen gaan bewust NIET naar
 * sessionStorage. Dat zijn persoonsgegevens over een minderjarige, en
 * bewaren mag alleen als het nodig is (dataminimalisatie, art. 5 lid 1 sub
 * c AVG). Op een gedeelde docentencomputer blijven ze anders in de browser
 * van de school staan tot het tabblad sluit, buiten het zicht van de
 * docent. Alleen de onpersoonlijke instellingen (soort tekst en toon)
 * worden als concept bewaard; die zeggen niets over een leerling.
 */
type RapportInstellingen = Pick<ReportInput, "outputType" | "toon" | "periode" | "niveau" | "aanspreekvorm" | "lengte">;
type RapportPersoonlijk = Pick<ReportInput, "leerlingLabel" | "aantekeningen">;

const DEFAULT_INSTELLINGEN: RapportInstellingen = {
  outputType: "rapporttekst",
  toon: "vriendelijk-direct",
  periode: "rapport-1",
  niveau: "po",
  aanspreekvorm: "over-leerling",
  lengte: "normaal",
};

const LEEG_PERSOONLIJK: RapportPersoonlijk = {
  leerlingLabel: "",
  aantekeningen: "",
};

/**
 * Een bewaard concept komt uit sessionStorage en is dus niet te
 * vertrouwen: elk veld langs hetzelfde type en dezelfde toegestane waarden
 * als de serverside route, en wat niet klopt valt terug op de default.
 */
function herstelInstellingen(
  ruw: Record<string, unknown>,
  defaults: RapportInstellingen
): RapportInstellingen {
  return {
    outputType:
      conceptKeuze(
        ruw.outputType,
        OUTPUT_TYPES.map((t) => t.waarde)
      ) ?? defaults.outputType,
    toon: conceptKeuze(
      ruw.toon,
      TONEN.map((t) => t.waarde)
    ) ?? defaults.toon,
  };
}

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
 * POST /api/reports. Daarna gaat de docent naar /app/reports/[id], waar de
 * tekst staat met de kopieer- en downloadknop. Bij een fout blijft de invoer
 * staan en kan het op hetzelfde scherm direct opnieuw.
 */
export default function NewReportPage() {
  const router = useRouter();
  const [stap, setStap] = useState<1 | 2>(1);
  const [instellingenOpen, setInstellingenOpen] = useState(false);
  const [fouten, setFouten] = useState<Fouten>({});
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  // Persoonlijke velden blijven in gewone component-state: die verdwijnen
  // bij het verlaten van de pagina, en komen nergens in opslag terecht.
  const [persoonlijk, setPersoonlijk] = useState<RapportPersoonlijk>(LEEG_PERSOONLIJK);
  const {
    waarde: instellingen,
    zetWaarde: setInstellingen,
    wisConcept,
  } = useDraft<RapportInstellingen>(
    "reports",
    DEFAULT_INSTELLINGEN,
    herstelInstellingen
  );

  const input: ReportInput = { ...persoonlijk, ...instellingen };
  const kwaliteit = controleerRapportKwaliteit(input);

  const leerlingRef = useRef<HTMLInputElement>(null);
  const aantekeningenRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const toonRef = useRef<HTMLDivElement>(null);
  const kopRef = useRef<HTMLHeadingElement>(null);
  const overzichtKopRef = useRef<HTMLHeadingElement>(null);
  const genereerKnopRef = useRef<HTMLButtonElement>(null);
  // Houdt een tweede klik op "Schrijf het rapport" tegen: `bezig` in state
  // komt pas ná de renderronde terug, een ref direct.
  const bezigRef = useRef(false);

  /**
   * Focus naar een veld nádat React de nieuwe stap of het uitgeklapte
   * instellingenblok heeft gerenderd. Bewust in een animatieframe en niet
   * in een effect: een effect zou de focus-state weer moeten opruimen, en
   * setState in een effect veroorzaakt een extra renderronde.
   *
   * Bestaat het veld niet (nog niet gerenderd, of weggevallen), dan gaat de
   * focus naar de kop van de stap: nooit naar niets, want dan valt de focus
   * terug naar body en is de plek in het formulier kwijt.
   */
  const focusNaar = useCallback((doel: FocusDoel) => {
    requestAnimationFrame(() => {
      const doelen: Record<FocusDoel, HTMLElement | null> = {
        leerlingLabel: leerlingRef.current,
        aantekeningen: aantekeningenRef.current,
        outputType: outputRef.current?.querySelector("input") ?? null,
        toon: toonRef.current?.querySelector("input") ?? null,
      };
      (doelen[doel] ?? kopRef.current)?.focus();
    });
  }, []);

  /** Na een stapwissel zonder veld: de kop van de nieuwe stap. */
  const focusKop = useCallback((kop: "stap1" | "overzicht") => {
    requestAnimationFrame(() => {
      const doel = kop === "overzicht" ? overzichtKopRef.current : kopRef.current;
      (doel ?? kopRef.current)?.focus();
    });
  }, []);

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
    focusKop("overzicht");
  }

  async function genereer() {
    // Dubbele submit: een tweede klik binnen dezelfde renderronde zou een
    // tweede tekst genereren én een tweede keer van het quotum afhalen.
    if (bezigRef.current) return;
    bezigRef.current = true;
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
      const { id } = await response.json();
      wisConcept();
      // Bewust geen setBezig(false): de knop blijft "bezig" tot de
      // tekstpagina staat. Zelfde gedrag als de les- en toets-wizard.
      router.push("/app/reports/" + id);
    } catch (err) {
      console.error("Rapport genereren mislukt", err);
      setFout(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
      setBezig(false);
      // De melding is nieuw op het scherm: breng de focus naar de knop die
      // hem oplost, anders moet een schermlezer zelf terugzoeken.
      requestAnimationFrame(() => genereerKnopRef.current?.focus());
    } finally {
      bezigRef.current = false;
    }
  }


  const samenvatting = `Een ${TOON_LABEL[input.toon]} ${OUTPUT_LABEL[input.outputType]}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper
        stap={stap}
        totaal={2}
        titel={stap === 1 ? "Over wie gaat de tekst?" : "Klopt dit zo?"}
        terug={
          stap === 1
            ? "/app"
            : () => {
                setStap(1);
                focusKop("stap1");
              }
        }
        terugLabel={stap === 1 ? "Terug naar start" : "Terug naar stap 1"}
        kopRef={kopRef}
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
                    setPersoonlijk({ ...persoonlijk, leerlingLabel: e.target.value })
                  }
                  placeholder="Sanne"
                  className={VELD_KLASSEN}
                />
              )}
            </Field>

            <div className="space-y-6 rounded-xl border-2 border-lijn bg-ivoor p-4">
              <ChoiceCards legend="Rapportperiode" keuzes={PERIODES} waarde={input.periode ?? "rapport-1"} onChange={(waarde) => setInstellingen({ ...instellingen, periode: waarde })} />
              <ChoiceCards legend="Niveau" keuzes={NIVEAUS} waarde={input.niveau ?? "po"} onChange={(waarde) => setInstellingen({ ...instellingen, niveau: waarde })} />
              <ChoiceCards legend="Aanspreekvorm" keuzes={[{ waarde: "over-leerling" as RapportAanspreekvorm, label: "Over de leerling" }, { waarde: "aan-leerling" as RapportAanspreekvorm, label: "Aan de leerling" }]} waarde={input.aanspreekvorm ?? "over-leerling"} onChange={(waarde) => setInstellingen({ ...instellingen, aanspreekvorm: waarde })} />
              <ChoiceCards legend="Lengte" keuzes={LENGTES} waarde={input.lengte ?? "normaal"} onChange={(waarde) => setInstellingen({ ...instellingen, lengte: waarde })} kolommen={3} />
            </div>

            <div className="rounded-xl border-2 border-lijn bg-ivoor p-4" aria-live="polite">
              <h2 className="text-base font-semibold text-marine">Zinnenbank</h2>
              <p className="mt-1 text-base text-tekst-zacht">Klik op een zin om hem aan je aantekeningen toe te voegen.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Object.values(RAPPORT_ZINNENBANK).flat().map((zin) => <button type="button" key={zin} className="min-h-11 rounded-lg border-2 border-lijn bg-ivoor-deep px-3 py-2 text-left text-base text-tekst hover:border-marine focus:outline-none focus:ring-2 focus:ring-marine" onClick={() => setPersoonlijk({ ...persoonlijk, aantekeningen: persoonlijk.aantekeningen ? `${persoonlijk.aantekeningen}; ${zin}` : zin })}>{zin}</button>)}
              </div>
            </div>

            <div className="rounded-xl border-2 border-lijn bg-ivoor p-4" aria-live="polite">
              <p className="text-base font-semibold text-marine">Controle voor opslaan</p>
              <p className="mt-1 text-base text-tekst">{kwaliteit.ok ? "De basiscontroles zijn in orde." : "Kijk deze punten na voordat je opslaat."}</p>
              {kwaliteit.checks.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-tekst">{kwaliteit.checks.map((check) => <li key={`${check.kind}-${check.melding}`}>{check.melding}</li>)}</ul>}
            </div>

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
                      setPersoonlijk({ ...persoonlijk, aantekeningen: e.target.value })
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
                      onChange={(waarde) =>
                        setInstellingen({ ...instellingen, outputType: waarde })
                      }
                    />
                  </div>

                  <div ref={toonRef}>
                    <ChoiceCards<RapportToon>
                      legend="Toon"
                      hulptekst="Je kunt de tekst daarna nog zelf bijschaven."
                      keuzes={TONEN}
                      waarde={input.toon}
                      onChange={(waarde) =>
                        setInstellingen({ ...instellingen, toon: waarde })
                      }
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
            {/* Focusdoel na de stapwissel. tabIndex -1 houdt de kop buiten
                de Tab-volgorde, maar maakt hem wel programmatisch te
                focussen, zodat een schermlezer stap 2 vanaf het begin
                voorleest in plaats van vanaf de oude plek. */}
            <h2
              ref={overzichtKopRef}
              tabIndex={-1}
              className="font-display text-2xl text-marine"
            >
              Overzicht van je keuzes
            </h2>

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

            {/* role="alert" meldt de fout zodra hij verschijnt, zonder dat
                de focus hoeft te verspringen; de focus gaat daarna naar de
                knop die hem oplost. */}
            {fout && (
              <div
                role="alert"
                className="rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4"
              >
                <p className="text-base font-medium text-fout-tekst">{fout}</p>
                <p className="mt-1 text-base text-tekst-zacht">
                  Je invoer staat er nog. Je kunt het direct opnieuw proberen.
                </p>
              </div>
            )}

            <Button
              ref={genereerKnopRef}
              variant="primary"
              volleBreedte
              disabled={bezig}
              onClick={genereer}
            >
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
