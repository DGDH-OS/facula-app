"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VAKKEN, VAKKEN_MET_NIEUWSBRON } from "@/lib/types";
import type { TestInput, Vak, Niveau } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { conceptGetal, conceptKeuze, conceptTekst, useDraft } from "@/lib/useDraft";
import { parseBoekBegrippen } from "@/lib/boek-begrippen";
import { BronnenZoeker } from "@/components/tests/BronnenZoeker";
import { Button } from "@/components/ui/Button";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { FormCard } from "@/components/ui/FormCard";
import { ProgressNotice } from "@/components/ui/ProgressNotice";
import { Stepper } from "@/components/ui/Stepper";

const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

/** Zelfde grenzen als de serverside validatie in /api/tests (src/lib/validation.ts). */
const MAX_LEERDOEL = 2000;
const MAX_KERNBEGRIPPEN = 2000;

/** Leest een .txt of .docx lokaal in de browser; er gaat niets naar een server. */
async function leesToetsBestand(bestand: File): Promise<string> {
  if (bestand.name.toLowerCase().endsWith(".txt")) return (await bestand.text()).slice(0, 20000);
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await bestand.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  const tekst = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\/>/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return tekst.slice(0, 20000);
}
const MIN_VRAGEN = 1;
const MAX_VRAGEN = 40;
const VASTE_AANTALLEN = [5, 10, 15, 20];
const MIN_LEERJAAR = 1;
const MAX_LEERJAAR = 6;

const DEFAULT_INPUT: TestInput = {
  vak: "Maatschappijleer",
  niveau: "havo",
  leerjaar: 4,
  leerdoel: "",
  kernbegrippen: "",
  boekBegrippen: "",
  bronTekst: "",
  bronVermelding: "",
  eigenVragen: "",
  aantalVragen: 10,
};

/**
 * Een bewaard concept komt uit sessionStorage en is dus niet te
 * vertrouwen: elk veld langs hetzelfde type en dezelfde grenzen als de
 * serverside route, en wat niet klopt valt terug op de default. Nooit
 * blind over de state heen spreiden.
 */
function herstelToetsInput(
  ruw: Record<string, unknown>,
  defaults: TestInput
): TestInput {
  return {
    vak: conceptKeuze(ruw.vak, VAKKEN) ?? defaults.vak,
    niveau: conceptKeuze(ruw.niveau, NIVEAUS) ?? defaults.niveau,
    leerjaar: conceptGetal(ruw.leerjaar, MIN_LEERJAAR, MAX_LEERJAAR) ?? defaults.leerjaar,
    leerdoel: conceptTekst(ruw.leerdoel, MAX_LEERDOEL) ?? defaults.leerdoel,
    kernbegrippen: conceptTekst(ruw.kernbegrippen, MAX_KERNBEGRIPPEN) ?? defaults.kernbegrippen,
    boekBegrippen: conceptTekst(ruw.boekBegrippen, 6000) ?? defaults.boekBegrippen,
    bronTekst: conceptTekst(ruw.bronTekst, 12000) ?? defaults.bronTekst,
    bronVermelding: conceptTekst(ruw.bronVermelding, 300) ?? defaults.bronVermelding,
    eigenVragen: conceptTekst(ruw.eigenVragen, 20000) ?? defaults.eigenVragen,
    aantalVragen: conceptGetal(ruw.aantalVragen, MIN_VRAGEN, MAX_VRAGEN) ?? defaults.aantalVragen,
  };
}

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
 * POST /api/tests. Daarna gaat de docent naar /app/tests/[id], dezelfde weg
 * als bij een les: het resultaat staat op een eigen pagina en is dus ook
 * morgen nog terug te vinden. Bij een fout blijft de invoer staan en kan er
 * direct opnieuw geprobeerd worden.
 */
export default function NewTestPage() {
  const router = useRouter();
  const [stap, setStap] = useState<1 | 2>(1);
  const [eigenAantal, setEigenAantal] = useState(false);
  const [instellingenOpen, setInstellingenOpen] = useState(false);
  const [fouten, setFouten] = useState<Fouten>({});
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  /** Een concept met een eigen aantal vragen moet dat veld ook tonen. */
  const naHerstel = useCallback((hersteld: TestInput) => {
    if (!VASTE_AANTALLEN.includes(hersteld.aantalVragen)) {
      setEigenAantal(true);
      setInstellingenOpen(true);
    }
  }, []);

  const {
    waarde: input,
    zetWaarde: setInput,
    wisConcept,
  } = useDraft<TestInput>("tests", DEFAULT_INPUT, herstelToetsInput, naHerstel, {
    slaHerstelOver:
      typeof window !== "undefined" && new URLSearchParams(window.location.search).has("periode"),
  });


  /**
   * Staat er `?periode=<id>` in de URL, dan komen leerdoelen, begrippen, vak en
   * niveau uit die periode (RLS geeft alleen de eigen rijen terug). Er wordt
   * hier nooit uit zichzelf gegenereerd.
   */
  const periodeGeladen = useRef(false);
  useEffect(() => {
    if (periodeGeladen.current) return;
    const id = new URLSearchParams(window.location.search).get("periode");
    if (!id) return;
    periodeGeladen.current = true;
    createClient()
      .schema("facula")
      .from("periodes")
      .select("vak, niveau, leerjaar, leerdoelen, begrippen")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        wisConcept();
        setInput((huidig) => ({
          ...huidig,
          vak: conceptKeuze(data.vak, VAKKEN) ?? huidig.vak,
          niveau: conceptKeuze(data.niveau, NIVEAUS) ?? huidig.niveau,
          leerjaar: conceptGetal(data.leerjaar, 1, 6) ?? huidig.leerjaar,
          leerdoel: conceptTekst(data.leerdoelen, 2000) ?? huidig.leerdoel,
          boekBegrippen: conceptTekst(data.begrippen, 6000) ?? huidig.boekBegrippen,
        }));
      });
  }, [setInput, wisConcept]);

  const zoekBegrippen = [
    ...new Set([
      ...parseBoekBegrippen(input.boekBegrippen).map((b) => b.begrip),
      ...input.kernbegrippen
        .split(/,|\n/)
        .map((b) => b.trim())
        .filter(Boolean),
    ]),
  ];
  const [vanPeriode] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("periode")
  );

  const leerdoelRef = useRef<HTMLTextAreaElement>(null);
  const kernbegrippenRef = useRef<HTMLTextAreaElement>(null);
  const aantalEigenRef = useRef<HTMLInputElement>(null);
  const aantalRef = useRef<HTMLDivElement>(null);
  const leerjaarRef = useRef<HTMLDivElement>(null);
  const vakRef = useRef<HTMLSelectElement>(null);
  const niveauRef = useRef<HTMLSelectElement>(null);
  const kopRef = useRef<HTMLHeadingElement>(null);
  const overzichtKopRef = useRef<HTMLHeadingElement>(null);
  const genereerKnopRef = useRef<HTMLButtonElement>(null);
  // Houdt een tweede klik op "Maak de toets" tegen: `bezig` in state komt
  // pas ná de renderronde terug, een ref direct.
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
        kernbegrippen: kernbegrippenRef.current,
        aantalVragen:
          aantalEigenRef.current ?? aantalRef.current?.querySelector("input") ?? null,
        leerjaar: leerjaarRef.current?.querySelector("input") ?? null,
        vak: vakRef.current,
        niveau: niveauRef.current,
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
    focusKop("overzicht");
  }

  async function genereer() {
    // Dubbele submit: een tweede klik binnen dezelfde renderronde zou een
    // tweede toets genereren én een tweede keer van het quotum afhalen.
    if (bezigRef.current) return;
    bezigRef.current = true;
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
          boekBegrippen: (input.boekBegrippen ?? "").trim(),
          bronTekst: (input.bronTekst ?? "").trim(),
          bronVermelding: (input.bronVermelding ?? "").trim(),
          eigenVragen: (input.eigenVragen ?? "").trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Genereren mislukt.");
      }
      const { id } = await response.json();
      wisConcept();
      // Bewust geen setBezig(false): de knop blijft "bezig" tot de
      // toetspagina staat, anders lijkt er even niets te gebeuren. Zelfde
      // gedrag als de les-wizard.
      router.push("/app/tests/" + id);
    } catch (err) {
      console.error("Toets genereren mislukt", err);
      setFout(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
      setBezig(false);
      // De melding is nieuw op het scherm: breng de focus naar de knop die
      // hem oplost, anders moet een schermlezer zelf terugzoeken.
      requestAnimationFrame(() => genereerKnopRef.current?.focus());
    } finally {
      bezigRef.current = false;
    }
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

            <Field
              label="Begrippen en definities uit je lesboek"
              hulptekst="Eén per regel: begrip: definitie. Facula neemt ze letterlijk over en verzint zelf niets."
            >
              {(ids) => (
                <textarea
                  {...ids}
                  rows={6}
                  maxLength={6000}
                  value={input.boekBegrippen ?? ""}
                  onChange={(e) => setInput({ ...input, boekBegrippen: e.target.value })}
                  placeholder={"Framing: (definitie uit je boek)\nPolarisatie: (definitie uit je boek)"}
                  className={`${VELD_KLASSEN} leading-relaxed`}
                />
              )}
            </Field>

            {VAKKEN_MET_NIEUWSBRON.includes(input.vak) && (
              <BronnenZoeker
                begrippen={zoekBegrippen}
                automatisch={vanPeriode}
                onKies={(tekst, vermelding) =>
                  setInput({ ...input, bronTekst: tekst, bronVermelding: vermelding })
                }
              />
            )}

            <Field
              label="Bron (optioneel)"
              hulptekst="Plak een bron uit je lesboek of een echt artikel. Facula maakt daar vragen bij over je begrippen en verzint zelf geen bronnen."
            >
              {(ids) => (
                <textarea
                  {...ids}
                  rows={8}
                  maxLength={12000}
                  value={input.bronTekst ?? ""}
                  onChange={(e) => setInput({ ...input, bronTekst: e.target.value })}
                  className={`${VELD_KLASSEN} leading-relaxed`}
                />
              )}
            </Field>

            <Field
              label="Bronvermelding"
              hulptekst="Verplicht bij een bron. Bijvoorbeeld: Naar: nos.nl, 12 maart 2026."
            >
              {(ids) => (
                <input
                  {...ids}
                  type="text"
                  maxLength={300}
                  value={input.bronVermelding ?? ""}
                  onChange={(e) => setInput({ ...input, bronVermelding: e.target.value })}
                  className={VELD_KLASSEN}
                />
              )}
            </Field>

            <Field
              label="Vragen uit je voorbeeldtoets (optioneel)"
              hulptekst="Plak of laad je voorbeeldtoets. Elke vraag begint met (1p) of (2p). De vragen worden letterlijk overgenomen."
            >
              {(ids) => (
                <>
                  <input
                    type="file"
                    accept=".docx,.txt"
                    aria-label="Laad een voorbeeldtoets (.docx of .txt)"
                    className="mb-3 block text-base"
                    onChange={async (e) => {
                      const bestand = e.target.files?.[0];
                      if (!bestand) return;
                      const tekst = await leesToetsBestand(bestand);
                      setInput({ ...input, eigenVragen: tekst });
                    }}
                  />
                  <textarea
                    {...ids}
                    rows={8}
                    maxLength={20000}
                    value={input.eigenVragen ?? ""}
                    onChange={(e) => setInput({ ...input, eigenVragen: e.target.value })}
                    className={`${VELD_KLASSEN} leading-relaxed`}
                  />
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
                          // Het getalveld verschijnt nu pas: zonder deze
                          // sprong moet de docent zelf gaan zoeken.
                          focusNaar("aantalVragen");
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
