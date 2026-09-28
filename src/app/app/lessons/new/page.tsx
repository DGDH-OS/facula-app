"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonInput, Vak, Niveau } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { conceptGetal, conceptKeuze, conceptTekst, useDraft } from "@/lib/useDraft";
import { Button } from "@/components/ui/Button";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { FormCard } from "@/components/ui/FormCard";
import { ProgressNotice } from "@/components/ui/ProgressNotice";
import { Stepper } from "@/components/ui/Stepper";

const VAKKEN: Vak[] = ["Maatschappijleer", "Geschiedenis", "Economie", "Aardrijkskunde"];
const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

/** Zelfde grenzen als de serverside validatie in /api/lessons. */
const MAX_LEERDOEL = 2000;
const MIN_LESDUUR = 10;
const MAX_LESDUUR = 240;
const VASTE_LESDUREN = [45, 50, 60, 90];
const MIN_LEERJAAR = 1;
const MAX_LEERJAAR = 6;
const MAX_LESSEN = 6;

const DEFAULT_INPUT: LessonInput = {
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  leerdoel: "",
  lesduur: 50,
  aantalLessen: 1,
};

/**
 * Een bewaard concept komt uit sessionStorage en is dus niet te
 * vertrouwen: elk veld langs hetzelfde type en dezelfde grenzen als de
 * serverside route, en wat niet klopt valt terug op de default. Nooit
 * blind over de state heen spreiden.
 */
function herstelLesInput(
  ruw: Record<string, unknown>,
  defaults: LessonInput
): LessonInput {
  return {
    vak: conceptKeuze(ruw.vak, VAKKEN) ?? defaults.vak,
    niveau: conceptKeuze(ruw.niveau, NIVEAUS) ?? defaults.niveau,
    leerjaar: conceptGetal(ruw.leerjaar, MIN_LEERJAAR, MAX_LEERJAAR) ?? defaults.leerjaar,
    leerdoel: conceptTekst(ruw.leerdoel, MAX_LEERDOEL) ?? defaults.leerdoel,
    lesduur: conceptGetal(ruw.lesduur, MIN_LESDUUR, MAX_LESDUUR) ?? defaults.lesduur,
    aantalLessen: conceptGetal(ruw.aantalLessen, 1, MAX_LESSEN) ?? defaults.aantalLessen,
  };
}

type FoutVeld = "leerdoel" | "lesduur" | "leerjaar";
type Fouten = Partial<Record<FoutVeld, string>>;

/** Waar de focus heen moet na "Wijzig" of na een validatiefout. */
type FocusDoel = FoutVeld | "vak" | "niveau" | "aantalLessen";

/**
 * Les-wizard in twee stappen (brief 10):
 *
 *   Stap 1  leerdoel + vak/niveau, de overige instellingen als gewone zin
 *           met een "Aanpassen"-knop die inline uitklapt.
 *   Stap 2  overzicht in gewone taal, per onderdeel een "Wijzig", daarna
 *           één primaire knop die genereert.
 *
 * Endpoint en request-body zijn ongewijzigd: dezelfde LessonInput naar
 * POST /api/lessons. Bij een fout blijft de invoer staan en kan er op
 * hetzelfde scherm opnieuw geprobeerd worden.
 */
export default function NewLessonPage() {
  const router = useRouter();
  const [stap, setStap] = useState<1 | 2>(1);
  const [eigenLesduur, setEigenLesduur] = useState(false);
  const [instellingenOpen, setInstellingenOpen] = useState(false);
  const [fouten, setFouten] = useState<Fouten>({});
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  /** Een concept met een eigen lesduur moet dat veld ook uitgeklapt tonen. */
  const naHerstel = useCallback((hersteld: LessonInput) => {
    if (!VASTE_LESDUREN.includes(hersteld.lesduur)) {
      setEigenLesduur(true);
      setInstellingenOpen(true);
    }
  }, []);

  /**
   * Staat er `?van=<id>` in de URL, dan is die les de bron van de invoer en
   * mag een bewaard concept er niet tussen komen. Eén keer vaststellen bij
   * het opzetten van de pagina: de lezing hieronder doet dat ook, en beide
   * moeten hetzelfde antwoord hebben.
   */
  const [vanUrl] = useState(() =>
    typeof window === "undefined"
      ? false
      : new URLSearchParams(window.location.search).has("van")
  );

  const {
    waarde: input,
    zetWaarde: setInput,
    wisConcept,
  } = useDraft<LessonInput>("lesson", DEFAULT_INPUT, herstelLesInput, naHerstel, {
    slaHerstelOver: vanUrl,
  });

  const leerdoelRef = useRef<HTMLTextAreaElement>(null);
  const lesduurRef = useRef<HTMLInputElement>(null);
  const leerjaarRef = useRef<HTMLInputElement>(null);
  const vakRef = useRef<HTMLSelectElement>(null);
  const niveauRef = useRef<HTMLSelectElement>(null);
  const aantalRef = useRef<HTMLDivElement>(null);
  const kopRef = useRef<HTMLHeadingElement>(null);
  const overzichtKopRef = useRef<HTMLHeadingElement>(null);
  const genereerKnopRef = useRef<HTMLButtonElement>(null);
  // Houdt een tweede klik op "Maak de les" tegen: `bezig` in state komt pas
  // ná de renderronde terug, een ref direct.
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
        leerdoel: leerdoelRef.current,
        lesduur: lesduurRef.current,
        leerjaar: leerjaarRef.current,
        vak: vakRef.current,
        niveau: niveauRef.current,
        aantalLessen: aantalRef.current?.querySelector("input") ?? null,
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
      if (doel === "lesduur" || doel === "aantalLessen" || doel === "leerjaar") {
        setInstellingenOpen(true);
      }
      setStap(1);
      focusNaar(doel);
    },
    [focusNaar]
  );

  /**
   * "Pas aan" en "Maak opnieuw" op de lespagina sturen hierheen met
   * `?van=<id>`, en "Maak opnieuw" ook met `&stap=2`. De invoer van die les
   * komt binnen via de gewone Supabase-client-lezing, dezelfde weg als de
   * rest van de app: RLS geeft alleen de eigen lessen terug. Geen nieuwe
   * API-route, geen extra validatie-pad — de invoer gaat langs precies
   * dezelfde `herstelLesInput` als een bewaard concept.
   *
   * Er wordt hier nooit uit zichzelf gegenereerd: "Maak opnieuw" zet de
   * docent op het overzicht van stap 2, en daar drukt die zelf op "Maak de
   * les". Zo is er altijd één bevestiging vóór er quotum op gaat.
   */
  const overgenomen = useRef(false);
  useEffect(() => {
    if (overgenomen.current) return;
    const params = new URLSearchParams(window.location.search);
    const van = params.get("van");
    if (!van) return;
    overgenomen.current = true;
    const naarOverzichtDirect = params.get("stap") === "2";

    let afgebroken = false;
    createClient()
      .schema("facula")
      .from("lessons")
      .select("input")
      .eq("id", van)
      .single()
      .then(({ data, error }) => {
        if (afgebroken || error || !data) return;
        const ruw = data.input;
        if (ruw === null || typeof ruw !== "object" || Array.isArray(ruw)) return;

        const hersteld = herstelLesInput(ruw as Record<string, unknown>, DEFAULT_INPUT);
        // Het oude concept is nu achterhaald: weg ermee, vóór de nieuwe
        // invoer erin gaat. Daarna bewaart de wizard wijzigingen weer
        // gewoon, dit zet de opslag niet stil.
        wisConcept();
        setInput(hersteld);
        naHerstel(hersteld);
        if (naarOverzichtDirect) {
          setStap(2);
          focusKop("overzicht");
        }
      });

    return () => {
      afgebroken = true;
    };
  }, [setInput, naHerstel, focusKop, wisConcept]);

  function valideer(): Fouten {
    const nieuw: Fouten = {};
    const leerdoel = input.leerdoel.trim();
    if (!leerdoel) {
      nieuw.leerdoel = "Vul een leerdoel in, dan weet Facula wat de les moet doen.";
    } else if (leerdoel.length > MAX_LEERDOEL) {
      nieuw.leerdoel = `Het leerdoel mag maximaal ${MAX_LEERDOEL} tekens zijn.`;
    }
    if (
      !Number.isInteger(input.lesduur) ||
      input.lesduur < MIN_LESDUUR ||
      input.lesduur > MAX_LESDUUR
    ) {
      nieuw.lesduur = `Vul een lesduur tussen ${MIN_LESDUUR} en ${MAX_LESDUUR} minuten in.`;
    }
    if (
      !Number.isInteger(input.leerjaar) ||
      input.leerjaar < MIN_LEERJAAR ||
      input.leerjaar > MAX_LEERJAAR
    ) {
      nieuw.leerjaar = `Vul een leerjaar tussen ${MIN_LEERJAAR} en ${MAX_LEERJAAR} in.`;
    }
    return nieuw;
  }

  function naarOverzicht(e: React.FormEvent) {
    e.preventDefault();
    const nieuw = valideer();
    setFouten(nieuw);
    const eerste = (["leerdoel", "lesduur", "leerjaar"] as FoutVeld[]).find(
      (veld) => nieuw[veld]
    );
    if (eerste) {
      if (eerste !== "leerdoel") setInstellingenOpen(true);
      focusNaar(eerste);
      return;
    }
    setStap(2);
    focusKop("overzicht");
  }

  async function genereer() {
    // Dubbele submit: een tweede klik binnen dezelfde renderronde zou een
    // tweede les genereren én een tweede keer van het quotum afhalen.
    if (bezigRef.current) return;
    bezigRef.current = true;
    setBezig(true);
    setFout(null);

    try {
      const genResponse = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, leerdoel: input.leerdoel.trim() }),
      });

      if (!genResponse.ok) {
        const data = await genResponse.json().catch(() => null);
        throw new Error(data?.error ?? "Genereren mislukt.");
      }

      const { id } = await genResponse.json();
      wisConcept();
      // Bewust geen setBezig(false): de knop blijft "bezig" tot de
      // lespagina staat, anders lijkt er even niets te gebeuren.
      router.push("/app/lessons/" + id);
    } catch (err) {
      console.error("Les genereren mislukt", err);
      setFout(
        err instanceof Error
          ? err.message
          : "Er ging iets mis. Probeer het opnieuw."
      );
      setBezig(false);
      // De melding is nieuw op het scherm: breng de focus naar de knop die
      // hem oplost, anders moet een schermlezer zelf terugzoeken.
      requestAnimationFrame(() => genereerKnopRef.current?.focus());
    } finally {
      bezigRef.current = false;
    }
  }

  const samenvatting = `${input.aantalLessen} ${
    input.aantalLessen === 1 ? "les" : "lessen"
  } van ${input.lesduur} minuten, ${input.niveau} leerjaar ${input.leerjaar}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Stepper
        stap={stap}
        totaal={2}
        titel={stap === 1 ? "Waar gaat de les over?" : "Klopt dit zo?"}
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
            <Field
              label="Leerdoel"
              verplicht
              hulptekst="Schrijf in je eigen woorden wat leerlingen na de les kunnen. Je mag 1 tot 5 leerdoelen invullen, elk op een eigen regel."
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
                  <ChoiceCards<number | "anders">
                    legend="Lesduur"
                    keuzes={[
                      ...VASTE_LESDUREN.map((m) => ({
                        waarde: m as number | "anders",
                        label: `${m} min`,
                      })),
                      { waarde: "anders" as const, label: "Anders" },
                    ]}
                    waarde={eigenLesduur ? "anders" : input.lesduur}
                    onChange={(waarde) => {
                      if (waarde === "anders") {
                        setEigenLesduur(true);
                        // Het getalveld verschijnt nu pas: zonder deze
                        // sprong moet de docent zelf gaan zoeken.
                        focusNaar("lesduur");
                        return;
                      }
                      setEigenLesduur(false);
                      setInput({ ...input, lesduur: waarde });
                      setFouten({ ...fouten, lesduur: undefined });
                    }}
                    kolommen={3}
                  />

                  {eigenLesduur && (
                    <Field
                      label="Lesduur in minuten"
                      hulptekst={`Tussen ${MIN_LESDUUR} en ${MAX_LESDUUR} minuten.`}
                      fout={fouten.lesduur}
                    >
                      {(ids) => (
                        <input
                          {...ids}
                          ref={lesduurRef}
                          type="number"
                          inputMode="numeric"
                          min={MIN_LESDUUR}
                          max={MAX_LESDUUR}
                          value={input.lesduur}
                          onChange={(e) =>
                            setInput({ ...input, lesduur: Number(e.target.value) })
                          }
                          className={VELD_KLASSEN}
                        />
                      )}
                    </Field>
                  )}

                  <div ref={aantalRef}>
                    <ChoiceCards<number>
                      legend="Aantal lessen"
                      hulptekst="Facula verdeelt het leerdoel over dit aantal lessen."
                      keuzes={[1, 2, 3, 4, 5, 6].map((n) => ({
                        waarde: n,
                        label: String(n),
                      }))}
                      waarde={input.aantalLessen}
                      onChange={(waarde) =>
                        setInput({ ...input, aantalLessen: waarde })
                      }
                      kolommen={3}
                    />
                  </div>

                  <Field label="Leerjaar" fout={fouten.leerjaar}>
                    {(ids) => (
                      <input
                        {...ids}
                        ref={leerjaarRef}
                        type="number"
                        inputMode="numeric"
                        min={MIN_LEERJAAR}
                        max={MAX_LEERJAAR}
                        value={input.leerjaar}
                        onChange={(e) =>
                          setInput({ ...input, leerjaar: Number(e.target.value) })
                        }
                        className={VELD_KLASSEN}
                      />
                    )}
                  </Field>
                </div>
              )}
            </div>

            <Button type="submit" variant="primary" volleBreedte>
              Volgende
            </Button>
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
                label="Leerdoel"
                waarde={input.leerdoel.trim()}
                onWijzig={() => wijzig("leerdoel")}
              />
              <OverzichtRegel
                label="Vak"
                waarde={input.vak}
                onWijzig={() => wijzig("vak")}
              />
              <OverzichtRegel
                label="Niveau en leerjaar"
                waarde={`${input.niveau}, leerjaar ${input.leerjaar}`}
                onWijzig={() => wijzig("niveau")}
              />
              <OverzichtRegel
                label="Aantal lessen"
                waarde={`${input.aantalLessen} ${
                  input.aantalLessen === 1 ? "les" : "lessen"
                }`}
                onWijzig={() => wijzig("aantalLessen")}
              />
              <OverzichtRegel
                label="Lesduur"
                waarde={`${input.lesduur} minuten per les`}
                onWijzig={() => wijzig("lesduur")}
              />
            </dl>

            {/* Een AI-les kost ongeveer 30 seconden (gemeten, twee lesdelen).
                De verwachting hoort er dan bij te staan, anders lijkt een
                stille pagina van een halve minuut een fout. De geduldregel
                schuift mee naar 60 seconden, zodat die niet bij elke normale
                generatie vuurt maar wel bij een terugval op het tweede
                model. */}
            <ProgressNotice
              bezig={bezig}
              tekst="Facula schrijft je les. Dit duurt ongeveer 30 seconden."
              geduldNaMs={60_000}
            />

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
              {bezig ? "Facula schrijft je les..." : fout ? "Probeer opnieuw" : "Maak de les"}
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
