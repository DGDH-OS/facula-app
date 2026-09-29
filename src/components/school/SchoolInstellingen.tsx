"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { ErrorNotice, SuccessNotice } from "@/components/ui/Notice";
import { HuisstijlVoorbeeld } from "@/components/huisstijl/HuisstijlVoorbeeld";
import {
  controleerContrast,
  MAX_LOGO_BYTES,
  normaliseerHex,
  PRESETS,
  type Kleurenset,
  type Lettertype,
  type PresetNaam,
} from "@/lib/huisstijl/themes";

/**
 * De schoolinstellingen: naam, huisstijl, logo, en of die huisstijl voor
 * iedereen geldt.
 *
 * Dezelfde opzet als /app/huisstijl voor een docent, met dezelfde
 * contrastcheck vóór de opslagknop: een combinatie die op een beamer
 * onleesbaar is, kan hier niet bewaard worden, en de reden staat er in gewone
 * taal bij. De server doet die check nog een keer (PUT /api/school).
 *
 * Het logo gaat langs een eigen route en niet mee met de opslagknop, precies
 * zoals bij een docent: kleuren wijzigen mag nooit het logo kwijtmaken.
 */

const PRESET_VOLGORDE: PresetNaam[] = ["facula", "mihiriban", "rustig", "contrast", "eigen"];

export interface SchoolInstellingenProps {
  naam: string;
  preset: PresetNaam;
  accent: string;
  tekst: string;
  achtergrond: string;
  lettertype: Lettertype;
  afdwingen: boolean;
  heeftLogo: boolean;
}

export function SchoolInstellingen(props: SchoolInstellingenProps) {
  const router = useRouter();
  const [naam, setNaam] = useState(props.naam);
  const [preset, setPreset] = useState<PresetNaam>(props.preset);
  const [eigen, setEigen] = useState<Kleurenset>({
    accent: props.accent,
    tekst: props.tekst,
    achtergrond: props.achtergrond,
    lettertype: props.lettertype,
  });
  const [afdwingen, setAfdwingen] = useState(props.afdwingen);

  const [opslaan, setOpslaan] = useState(false);
  const [bewaard, setBewaard] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const [logoBezig, setLogoBezig] = useState(false);
  const [heeftLogo, setHeeftLogo] = useState(props.heeftLogo);
  // Cachebuster: zonder deze parameter laat de browser na een vervangen logo
  // het oude plaatje zien, en dan lijkt de upload mislukt terwijl hij lukte.
  const [logoVersie, setLogoVersie] = useState(() => Date.now());
  const bestandRef = useRef<HTMLInputElement>(null);

  const kleuren: Kleurenset = preset === "eigen" ? eigen : PRESETS[preset];
  const controle = useMemo(() => controleerContrast(kleuren), [kleuren]);

  async function bewaar() {
    if (opslaan) return;
    setOpslaan(true);
    setFout(null);
    setBewaard(false);
    try {
      const response = await fetch("/api/school", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          preset,
          accent: kleuren.accent,
          tekst: kleuren.tekst,
          achtergrond: kleuren.achtergrond,
          lettertype: kleuren.lettertype,
          afdwingen,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Opslaan lukte niet.");
      setBewaard(true);
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setOpslaan(false);
    }
  }

  async function uploadLogo(bestand: File) {
    setLogoBezig(true);
    setFout(null);
    try {
      if (bestand.size > MAX_LOGO_BYTES) {
        throw new Error("Het logo mag maximaal 2 MB zijn.");
      }
      const formulier = new FormData();
      formulier.append("logo", bestand);
      const response = await fetch("/api/school/logo", {
        method: "POST",
        body: formulier,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Uploaden lukte niet.");
      setHeeftLogo(true);
      setLogoVersie(Date.now());
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Uploaden lukte niet.");
    } finally {
      setLogoBezig(false);
      if (bestandRef.current) bestandRef.current.value = "";
    }
  }

  async function verwijderLogo() {
    setLogoBezig(true);
    setFout(null);
    try {
      const response = await fetch("/api/school/logo", { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Verwijderen lukte niet.");
      setHeeftLogo(false);
      setLogoVersie(Date.now());
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Verwijderen lukte niet.");
    } finally {
      setLogoBezig(false);
    }
  }

  return (
    <div className="space-y-8">
      <Field label="Naam van de school" verplicht>
        {(ids) => (
          <input
            {...ids}
            type="text"
            maxLength={200}
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            className={VELD_KLASSEN}
          />
        )}
      </Field>

      <ChoiceCards<PresetNaam>
        legend="Huisstijl van de school"
        hulptekst="Deze kleuren en dit lettertype komen in de PowerPoints en Word-bestanden van je docenten."
        keuzes={PRESET_VOLGORDE.map((naamVanPreset) => ({
          waarde: naamVanPreset,
          label: naamVanPreset === "eigen" ? "Eigen kleuren" : PRESETS[naamVanPreset].label,
          toelichting:
            naamVanPreset === "eigen"
              ? "Zelf drie kleuren en een lettertype kiezen."
              : PRESETS[naamVanPreset].omschrijving,
        }))}
        waarde={preset}
        onChange={setPreset}
      />

      {preset === "eigen" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <KleurVeld
            label="Accentkleur"
            hulptekst="Voor koppen, lijnen en de titeldia."
            waarde={eigen.accent}
            onChange={(waarde) => setEigen({ ...eigen, accent: waarde })}
          />
          <KleurVeld
            label="Tekstkleur"
            hulptekst="Voor gewone tekst op de dia."
            waarde={eigen.tekst}
            onChange={(waarde) => setEigen({ ...eigen, tekst: waarde })}
          />
          <KleurVeld
            label="Achtergrondkleur"
            hulptekst="De kleur van de dia en de pagina."
            waarde={eigen.achtergrond}
            onChange={(waarde) => setEigen({ ...eigen, achtergrond: waarde })}
          />
          <div>
            <ChoiceCards<Lettertype>
              legend="Lettertype"
              keuzes={[
                { waarde: "serif", label: "Met schreef", toelichting: "Georgia" },
                { waarde: "sans", label: "Zonder schreef", toelichting: "Arial" },
              ]}
              waarde={eigen.lettertype}
              onChange={(waarde) => setEigen({ ...eigen, lettertype: waarde })}
            />
          </div>
        </div>
      )}

      {!controle.ok && (
        <ErrorNotice
          melding="Deze combinatie is te licht om op een beamer te lezen."
          uitleg={controle.meldingen.join(" ")}
        />
      )}

      <div>
        <h3 className="text-base font-semibold text-marine">Zo ziet het eruit</h3>
        <div className="mt-3">
          <HuisstijlVoorbeeld
            kleuren={kleuren}
            schoolnaam={naam.trim() || null}
            logoUrl={heeftLogo ? "/api/school/logo?v=" + logoVersie : null}
            toonLogo={heeftLogo}
          />
        </div>
      </div>

      <div className="border-t-2 border-lijn pt-6">
        <h3 className="text-base font-semibold text-marine">Schoollogo</h3>
        <p className="mt-1 max-w-[70ch] text-base text-tekst-zacht">
          PNG of JPG, maximaal 2 MB. Het logo komt rechtsboven op de dia en
          boven aan een toets of brief. Wij verkleinen het en halen de
          metadata eruit.
        </p>

        {heeftLogo && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={"/api/school/logo?v=" + logoVersie}
              alt="Het logo van je school"
              className="h-16 w-auto rounded border-2 border-lijn bg-ivoor object-contain p-1"
            />
            <Button variant="secondary" onClick={verwijderLogo} disabled={logoBezig}>
              Logo verwijderen
            </Button>
          </div>
        )}

        <div className="mt-4">
          <label
            htmlFor="school-logo-bestand"
            className="block text-base font-semibold text-marine"
          >
            {heeftLogo ? "Ander logo kiezen" : "Logo kiezen"}
          </label>
          <input
            id="school-logo-bestand"
            ref={bestandRef}
            type="file"
            accept="image/png,image/jpeg"
            disabled={logoBezig}
            onChange={(e) => {
              const bestand = e.target.files?.[0];
              if (bestand) void uploadLogo(bestand);
            }}
            className="mt-2 block w-full text-base text-tekst"
          />
          {logoBezig && (
            <p aria-live="polite" className="mt-2 text-base text-tekst-zacht">
              Bezig met het logo...
            </p>
          )}
        </div>
      </div>

      <div className="border-t-2 border-lijn pt-6">
        <label className="flex min-h-14 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={afdwingen}
            onChange={(e) => setAfdwingen(e.target.checked)}
            className="mt-1 h-6 w-6 shrink-0 accent-marine"
          />
          <span>
            <span className="block text-base font-semibold text-marine">
              Deze huisstijl geldt voor alle docenten
            </span>
            <span className="mt-1 block max-w-[70ch] text-base text-tekst-zacht">
              Staat dit aan, dan komen alle downloads in de schoolhuisstijl.
              Docenten kunnen hun eigen kleuren nog wel instellen, maar die doen
              dan niets. Staat het uit, dan kiest elke docent zelf.
            </span>
          </span>
        </label>
      </div>

      {fout && <ErrorNotice melding={fout} />}
      {bewaard && <SuccessNotice melding="De instellingen van je school zijn bewaard." />}

      <div>
        <Button
          variant="primary"
          onClick={bewaar}
          disabled={opslaan || !controle.ok}
          aria-busy={opslaan}
        >
          {opslaan ? "Bezig met opslaan..." : "Instellingen opslaan"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Een kleurveld met een kleurkiezer en een tekstveld ernaast. Twee ingangen
 * voor dezelfde waarde, omdat een schoolhuisstijl vaak als hexcode wordt
 * aangeleverd door de huisstijlhandleiding, en een kleurkiezer fijner is als
 * die code er niet is.
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
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="h-14 w-16 shrink-0 cursor-pointer rounded-lg border-2 border-lijn bg-ivoor p-1"
          />
          <input
            type="text"
            value={waarde}
            maxLength={7}
            onChange={(e) => {
              const genormaliseerd = normaliseerHex(e.target.value);
              onChange(genormaliseerd ?? e.target.value.toUpperCase());
            }}
            className={VELD_KLASSEN}
          />
        </div>
      )}
    </Field>
  );
}
