"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { ProgressNotice } from "@/components/ui/ProgressNotice";
import { HuisstijlVoorbeeld } from "@/components/huisstijl/HuisstijlVoorbeeld";
import { haalHuisstijlClient } from "@/lib/huisstijl/client";
import {
  controleerContrast,
  MAX_LOGO_BYTES,
  normaliseerHex,
  PRESETS,
  STANDAARD_HUISSTIJL,
  type Huisstijl,
  type Kleurenset,
  type Lettertype,
  type PresetNaam,
} from "@/lib/huisstijl/themes";

/**
 * Huisstijl instellen: eenmalig kiezen hoe lessen, toetsen en rapporten eruit
 * zien.
 *
 * Opzet volgt de rest van de app: grote keuzekaarten in plaats van een
 * uitklaplijst, een voorvertoning die meteen meebeweegt, en een opslaan-knop
 * die pas iets doet als er ook echt iets te bewaren valt. De contrastcheck zit
 * in de knop zelf: een combinatie die op de beamer onleesbaar is, kan hier niet
 * opgeslagen worden, en de reden staat er in gewone taal bij.
 */

const PRESET_VOLGORDE: PresetNaam[] = ["facula", "mihiriban", "rustig", "contrast", "eigen"];

const EIGEN_OMSCHRIJVING = "Je eigen kleuren en lettertype instellen.";

export default function HuisstijlPage() {
  const [preset, setPreset] = useState<PresetNaam>(STANDAARD_HUISSTIJL.preset);
  const [eigen, setEigen] = useState<Kleurenset>({
    accent: PRESETS.facula.accent,
    tekst: PRESETS.facula.tekst,
    achtergrond: PRESETS.facula.achtergrond,
    lettertype: PRESETS.facula.lettertype,
  });
  const [schoolnaam, setSchoolnaam] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoStandaardAan, setLogoStandaardAan] = useState(true);

  const [laden, setLaden] = useState(true);
  const [opslaan, setOpslaan] = useState(false);
  const [logoBezig, setLogoBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bewaard, setBewaard] = useState(false);

  const bestandRef = useRef<HTMLInputElement>(null);

  /** De kleuren die nu getoond en straks opgeslagen worden. */
  const kleuren: Kleurenset = preset === "eigen" ? eigen : PRESETS[preset];
  const controle = useMemo(() => controleerContrast(kleuren), [kleuren]);

  function neemOver(huisstijl: Huisstijl) {
    setPreset(huisstijl.preset);
    setEigen({
      accent: huisstijl.accent,
      tekst: huisstijl.tekst,
      achtergrond: huisstijl.achtergrond,
      lettertype: huisstijl.lettertype,
    });
    setSchoolnaam(huisstijl.schoolnaam ?? "");
    setLogoStandaardAan(huisstijl.logoStandaardAan);
    // Een cachebuster per wijziging: zonder die parameter laat de browser na
    // een vervangen logo nog het oude plaatje zien, en dan lijkt de upload
    // mislukt terwijl hij geslaagd is.
    setLogoUrl(huisstijl.logoPath ? "/api/huisstijl/logo?v=" + Date.now() : null);
  }

  useEffect(() => {
    let actueel = true;
    (async () => {
      const huisstijl = await haalHuisstijlClient();
      if (!actueel) return;
      neemOver(huisstijl);
      setLaden(false);
    })();
    return () => {
      actueel = false;
    };
  }, []);

  async function bewaar() {
    if (opslaan) return;
    setOpslaan(true);
    setFout(null);
    setBewaard(false);
    try {
      const response = await fetch("/api/huisstijl", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset,
          accent: kleuren.accent,
          tekst: kleuren.tekst,
          achtergrond: kleuren.achtergrond,
          lettertype: kleuren.lettertype,
          schoolnaam: schoolnaam.trim(),
          logoStandaardAan,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Opslaan mislukt.");
      if (data?.huisstijl) neemOver(data.huisstijl as Huisstijl);
      setBewaard(true);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setOpslaan(false);
    }
  }

  async function uploadLogo(bestand: File) {
    setLogoBezig(true);
    setFout(null);
    setBewaard(false);
    try {
      // Grootte en type hier al controleren, zodat een docent met een te groot
      // bestand niet eerst een upload hoeft af te wachten. De server doet
      // dezelfde controle nog een keer, en leest daar ook de bestandskop.
      if (bestand.size > MAX_LOGO_BYTES) {
        throw new Error("Het logo mag maximaal 2 MB zijn.");
      }
      if (bestand.type !== "image/png" && bestand.type !== "image/jpeg") {
        throw new Error("Kies een PNG- of JPG-bestand.");
      }

      // Geen waarschuwing meer bij een groot bestand: de server verkleint het
      // logo bij de upload tot binnen 600x300 px, dus een foto van 2 MB
      // levert geen zware PowerPoint meer op.
      const formulier = new FormData();
      formulier.append("logo", bestand);
      const response = await fetch("/api/huisstijl/logo", {
        method: "POST",
        body: formulier,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Het uploaden lukte niet.");
      if (data?.huisstijl) neemOver(data.huisstijl as Huisstijl);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Het uploaden lukte niet.");
    } finally {
      setLogoBezig(false);
      if (bestandRef.current) bestandRef.current.value = "";
    }
  }

  async function verwijderLogo() {
    setLogoBezig(true);
    setFout(null);
    setBewaard(false);
    try {
      const response = await fetch("/api/huisstijl/logo", { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Verwijderen lukte niet.");
      if (data?.huisstijl) neemOver(data.huisstijl as Huisstijl);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Verwijderen lukte niet.");
    } finally {
      setLogoBezig(false);
    }
  }

  function zetEigenKleur(veld: keyof Kleurenset, waarde: string) {
    const hex = normaliseerHex(waarde);
    if (!hex) return;
    setEigen((huidig) => ({ ...huidig, [veld]: hex }));
    setBewaard(false);
  }

  if (laden) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl text-marine">Huisstijl</h1>
        <ProgressNotice bezig tekst="Je huisstijl wordt opgehaald..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-marine">Huisstijl</h1>
      <p className="mt-2 max-w-[70ch] text-base text-tekst">
        Stel dit een keer in. Daarna kun je bij elke les, toets en rapporttekst
        kiezen of je hem in je eigen huisstijl downloadt.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-2xl text-marine">Kies een stijl</h2>
        <fieldset className="mt-4">
          <legend className="sr-only">Stijl</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PRESET_VOLGORDE.map((naam) => (
              <PresetKaart
                key={naam}
                naam={naam}
                gekozen={preset === naam}
                onKies={() => {
                  setPreset(naam);
                  setBewaard(false);
                }}
              />
            ))}
          </div>
        </fieldset>
      </section>

      {preset === "eigen" && (
        <section className="mt-6 rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
          <h3 className="font-display text-xl text-marine">Je eigen kleuren</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KleurVeld
              label="Accentkleur"
              hulptekst="Voor koppen en lijnen."
              waarde={eigen.accent}
              onChange={(w) => zetEigenKleur("accent", w)}
            />
            <KleurVeld
              label="Tekstkleur"
              hulptekst="Voor gewone tekst."
              waarde={eigen.tekst}
              onChange={(w) => zetEigenKleur("tekst", w)}
            />
            <KleurVeld
              label="Achtergrondkleur"
              hulptekst="Van de dia en de pagina."
              waarde={eigen.achtergrond}
              onChange={(w) => zetEigenKleur("achtergrond", w)}
            />
          </div>

          <fieldset className="mt-6">
            <legend className="text-base font-semibold text-marine">Lettertype</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {(["serif", "sans"] as Lettertype[]).map((soort) => (
                <label
                  key={soort}
                  className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-lijn bg-ivoor px-4"
                >
                  <input
                    type="radio"
                    name="lettertype"
                    checked={eigen.lettertype === soort}
                    onChange={() => {
                      setEigen((h) => ({ ...h, lettertype: soort }));
                      setBewaard(false);
                    }}
                    className="h-6 w-6 accent-marine"
                  />
                  <span className="text-base text-tekst">
                    {soort === "serif" ? "Met schreef (Georgia)" : "Zonder schreef (Arial)"}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>
      )}

      {!controle.ok && (
        /* role="alert": dit verschijnt terwijl de docent aan een kleurkiezer
           draait, en het is de reden dat de opslaan-knop niet werkt. */
        <div
          role="alert"
          className="mt-6 rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4"
        >
          <p className="text-base font-semibold text-fout-tekst">
            Deze kleuren zijn te moeilijk leesbaar.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {controle.meldingen.map((melding) => (
              <li key={melding} className="max-w-[70ch] text-base text-fout-tekst">
                {melding}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-display text-2xl text-marine">Zo ziet het eruit</h2>
        <div className="mt-4">
          <HuisstijlVoorbeeld
            kleuren={kleuren}
            schoolnaam={schoolnaam.trim() || null}
            logoUrl={logoUrl}
            toonLogo={logoStandaardAan}
          />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
        <h2 className="font-display text-2xl text-marine">Je school</h2>

        <div className="mt-4">
          <Field
            label="Naam van je school"
            hulptekst="Komt klein onderaan je dia's en bovenaan je toetsen. Mag je leeg laten."
          >
            {(ids) => (
              <input
                {...ids}
                type="text"
                maxLength={120}
                value={schoolnaam}
                onChange={(e) => {
                  setSchoolnaam(e.target.value);
                  setBewaard(false);
                }}
                className={VELD_KLASSEN}
              />
            )}
          </Field>
        </div>

        <div className="mt-6">
          <h3 className="text-base font-semibold text-marine">Schoollogo</h3>
          <p className="mt-1 max-w-[70ch] text-base text-tekst-zacht">
            Een PNG- of JPG-bestand van maximaal 2 MB. We verkleinen het
            automatisch, zodat je lessen en toetsen licht blijven. Alleen het
            logo wordt bewaard, verwijder het wanneer je wilt.
          </p>

          {logoUrl && (
            <div className="mt-4 inline-flex items-center gap-4 rounded-xl border-2 border-lijn bg-ivoor p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Je huidige schoollogo"
                className="h-12 w-auto object-contain"
              />
              <Button onClick={verwijderLogo} disabled={logoBezig}>
                Logo verwijderen
              </Button>
            </div>
          )}

          <div className="mt-4">
            <label
              htmlFor="logo-bestand"
              className="block text-base font-semibold text-marine"
            >
              {logoUrl ? "Ander logo kiezen" : "Logo kiezen"}
            </label>
            <input
              id="logo-bestand"
              ref={bestandRef}
              type="file"
              accept="image/png,image/jpeg"
              disabled={logoBezig}
              onChange={(e) => {
                const bestand = e.target.files?.[0];
                if (bestand) void uploadLogo(bestand);
              }}
              className="mt-2 block w-full min-h-14 rounded-lg border-2 border-lijn bg-ivoor px-4 py-3 text-base text-tekst"
            />
          </div>

          <ProgressNotice bezig={logoBezig} tekst="Bezig met je logo..." />
        </div>
      </section>

      <section className="mt-6">
        <label className="flex min-h-14 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={logoStandaardAan}
            onChange={(e) => {
              setLogoStandaardAan(e.target.checked);
              setBewaard(false);
            }}
            className="h-6 w-6 shrink-0 accent-marine"
          />
          <span className="max-w-[70ch] text-base text-tekst">
            Logo standaard tonen op lessen, toetsen en rapporten
          </span>
        </label>
      </section>

      {fout && (
        <div
          role="alert"
          className="mt-6 rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4"
        >
          <p className="max-w-[70ch] text-base font-medium text-fout-tekst">{fout}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 border-t-2 border-lijn pt-6 sm:flex-row sm:items-center">
        <Button
          variant="primary"
          onClick={bewaar}
          disabled={opslaan || !controle.ok}
          aria-busy={opslaan}
          volleBreedte
          className="sm:w-auto"
        >
          {opslaan ? "Bezig met opslaan..." : "Huisstijl opslaan"}
        </Button>

        {/* aria-live in plaats van role="alert": een geslaagde opslag hoeft
            de docent niet te onderbreken. */}
        <p aria-live="polite" className="text-base text-succes-tekst">
          {bewaard ? "Opgeslagen." : ""}
        </p>
      </div>
    </div>
  );
}

/**
 * Eén stijlkaart. Echte radio-input in plaats van een knop met aria-pressed,
 * zodat pijltjestoetsen werken en een schermlezer "3 van 5" voorleest, net als
 * bij ChoiceCards elders in de app.
 */
function PresetKaart({
  naam,
  gekozen,
  onKies,
}: {
  naam: PresetNaam;
  gekozen: boolean;
  onKies: () => void;
}) {
  const isEigen = naam === "eigen";
  const kleuren = isEigen ? PRESETS.facula : PRESETS[naam];
  const label = isEigen ? "Eigen kleuren" : PRESETS[naam].label;
  const omschrijving = isEigen ? EIGEN_OMSCHRIJVING : PRESETS[naam].omschrijving;
  const kaartKlassen = gekozen
    ? "border-marine bg-ivoor-deep"
    : "border-lijn bg-ivoor hover:border-marine";

  return (
    <label
      className={
        "flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors duration-200 " +
        kaartKlassen
      }
    >
      <input
        type="radio"
        name="preset"
        checked={gekozen}
        onChange={onKies}
        className="mt-1 h-6 w-6 shrink-0 accent-marine"
      />
      <span className="min-w-0 flex-1">
        <span className={gekozen ? "block text-base font-bold text-marine" : "block text-base font-medium text-marine"}>
          {label}
          {gekozen && (
            <span className="ml-2 font-bold" aria-hidden>
              &#10003;
            </span>
          )}
        </span>
        <span className="mt-1 block text-base text-tekst-zacht">{omschrijving}</span>
        {!isEigen && (
          <span className="mt-2 flex gap-1" aria-hidden>
            {[kleuren.achtergrond, kleuren.accent, kleuren.tekst].map((kleur) => (
              <span
                key={kleur}
                className="h-5 w-8 rounded border border-lijn"
                style={{ backgroundColor: kleur }}
              />
            ))}
          </span>
        )}
      </span>
    </label>
  );
}

/**
 * Een kleurkiezer plus een tekstveld met dezelfde waarde. De kiezer is prettig
 * om mee te spelen, het tekstveld is nodig zodra een school een vaste hexcode
 * heeft doorgegeven, en met alleen een kleurkiezer is die niet in te voeren.
 */
function KleurVeld({
  label,
  hulptekst,
  waarde,
  onChange,
}: {
  label: string;
  hulptekst: string;
  waarde: string;
  onChange: (waarde: string) => void;
}) {
  return (
    <Field label={label} hulptekst={hulptekst}>
      {(ids) => (
        <div className="flex items-center gap-3">
          <input
            {...ids}
            type="color"
            value={waarde}
            onChange={(e) => onChange(e.target.value)}
            className="h-14 w-14 shrink-0 cursor-pointer rounded-lg border-2 border-lijn bg-ivoor"
          />
          <input
            type="text"
            value={waarde}
            aria-label={label + " als hexcode"}
            onChange={(e) => onChange(e.target.value)}
            className={VELD_KLASSEN}
          />
        </div>
      )}
    </Field>
  );
}
