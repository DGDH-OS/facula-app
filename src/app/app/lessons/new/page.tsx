"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonInput, Vak, Niveau } from "@/lib/types";
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

/** Sleutel voor het concept; user-id is client-side niet beschikbaar. */
const CONCEPT_SLEUTEL = "facula-draft-lesson";

const DEFAULT_INPUT: LessonInput = {
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  leerdoel: "",
  lesduur: 50,
  aantalLessen: 1,
};

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
  const [input, setInput] = useState<LessonInput>(DEFAULT_INPUT);
  const [eigenLesduur, setEigenLesduur] = useState(false);
  const [instellingenOpen, setInstellingenOpen] = useState(false);
  const [fouten, setFouten] = useState<Fouten>({});
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const leerdoelRef = useRef<HTMLTextAreaElement>(null);
  const lesduurRef = useRef<HTMLInputElement>(null);
  const leerjaarRef = useRef<HTMLInputElement>(null);
  const vakRef = useRef<HTMLSelectElement>(null);
  const niveauRef = useRef<HTMLSelectElement>(null);
  const aantalRef = useRef<HTMLDivElement>(null);
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
        lesduur: lesduurRef.current,
        leerjaar: leerjaarRef.current,
        vak: vakRef.current,
        niveau: niveauRef.current,
        aantalLessen: aantalRef.current?.querySelector("input") ?? null,
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
        const concept = JSON.parse(opgeslagen) as Partial<LessonInput>;
        setInput((huidig) => ({ ...huidig, ...concept }));
        if (
          typeof concept.lesduur === "number" &&
          !VASTE_LESDUREN.includes(concept.lesduur)
        ) {
          setEigenLesduur(true);
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
      if (doel === "lesduur" || doel === "aantalLessen" || doel === "leerjaar") {
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
    if (!Number.isInteger(input.leerjaar) || input.leerjaar < 1 || input.leerjaar > 6) {
      nieuw.leerjaar = "Vul een leerjaar tussen 1 en 6 in.";
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
  }

  async function genereer() {
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
      sessionStorage.removeItem(CONCEPT_SLEUTEL);
      router.push("/app/lessons/" + id);
    } catch (err) {
      console.error("Les genereren mislukt", err);
      setFout(
        err instanceof Error
          ? err.message
          : "Er ging iets mis. Probeer het opnieuw."
      );
      setBezig(false);
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
        terug={stap === 1 ? "/app" : () => setStap(1)}
        terugLabel={stap === 1 ? "Terug naar start" : "Terug naar stap 1"}
      />

      <div key={stap} className="stap-fade">
        {stap === 1 ? (
          <FormCard onSubmit={naarOverzicht} className="mt-8">
            <Field
              label="Leerdoel"
              verplicht
              hulptekst="Schrijf in je eigen woorden wat leerlingen na de les kunnen."
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
                        min={1}
                        max={6}
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
              {bezig ? "Bezig met maken..." : fout ? "Probeer opnieuw" : "Maak de les"}
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
