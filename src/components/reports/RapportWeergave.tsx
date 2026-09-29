"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { GeneratedReport, RapportOutputType } from "@/lib/types";
import { downloadRapportDocx } from "@/lib/report-docx-export";
import { useHuisstijl, useLogoKeuze } from "@/lib/huisstijl/client";
import { HuisstijlSchakelaars } from "@/components/huisstijl/HuisstijlSchakelaars";
import { AiMelding } from "@/components/ui/AiMelding";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/Notice";
import { controleerRapportKwaliteit } from "@/lib/report-quality";
import { controleerOutputTegenInvoer } from "@/lib/avg-guardrails";
import { normaliseerRapportGuardrail, rapportExportGeblokkeerd } from "@/lib/report-compat";

const OUTPUT_LABEL: Record<RapportOutputType, string> = {
  rapporttekst: "Rapporttekst",
  oudergesprek: "Verslag oudergesprek",
  oudermail: "Concept oudermail",
};
const TRANSPARANTIE = "Concept gegenereerd uit jouw aantekeningen. Jij blijft auteur. Geen officieel rapport of OKR.";
const CHECKS = ["Alleen wat ik noteerde", "Concreet voorbeeld", "Sterkte en aandacht", "Geen cijfer/advies", "Initialen", "Toon past bij ontvanger"];

/**
 * De geschreven rapporttekst: voorvertoning, kopieerknop en download.
 *
 * Zelfde reden als bij ToetsWeergave: dit stond in /app/reports/new en was
 * daardoor weg zodra de docent wegnavigeerde. Nu staat het resultaat op
 * /app/reports/[id] en gebruikt die pagina deze weergave.
 *
 * De guardrail-melding hoort hierbij en niet bij de pagina: of er cijfer- of
 * oordeeltaal in de tekst staat die niet uit de aantekeningen kwam, is een
 * eigenschap van dit resultaat en moet overal meekomen waar het te zien is.
 */
export function RapportWeergave({
  rapport,
  extraActie,
}: {
  rapport: GeneratedReport;
  extraActie?: ReactNode;
}) {
  const { huisstijl, logo } = useHuisstijl();
  const [huisstijlAan, setHuisstijlAan] = useState(false);
  const [logoAan, setLogoAan] = useLogoKeuze(huisstijl);
  const [gekopieerd, setGekopieerd] = useState(false);
  const [exporteren, setExporteren] = useState(false);
  const [exportFout, setExportFout] = useState<string | null>(null);
  const [tekst, setTekst] = useState(rapport.tekst);
  const [checks, setChecks] = useState<boolean[]>(Array(6).fill(false));
  const kwaliteit = controleerRapportKwaliteit(rapport.input, tekst);
  const guardrail = normaliseerRapportGuardrail(rapport.guardrail);
  const exportGeblokkeerd = rapportExportGeblokkeerd(
    controleerOutputTegenInvoer(rapport.input.aantekeningen, tekst).ok,
    checks,
    kwaliteit,
  );
  const exportHintId = "rapport-export-hint";

  async function handleCopy() {
    const actueleGuardrail = controleerOutputTegenInvoer(rapport.input.aantekeningen, tekst);
    if (rapportExportGeblokkeerd(actueleGuardrail.ok, checks, kwaliteit)) {
      setExportFout("Vink eerst alle coachchecks aan en los harde waarschuwingen op.");
      return;
    }
    try {
      await navigator.clipboard.writeText(tekst);
      setGekopieerd(true);
      window.setTimeout(() => setGekopieerd(false), 4000);
    } catch {
      // Klembord geweigerd (oudere browser, geen https): de tekst staat er
      // nog, dus de docent kan hem gewoon selecteren.
      setExportFout("Kopiëren lukte niet. Selecteer de tekst en kopieer hem zelf.");
    }
  }

  async function exporteerNaarWord() {
    if (exportGeblokkeerd) {
      setExportFout("Vink eerst alle coachchecks aan en los harde waarschuwingen op.");
      return;
    }
    setExporteren(true);
    setExportFout(null);
    try {
      await downloadRapportDocx({ ...rapport, tekst }, {
        huisstijl: huisstijlAan ? huisstijl : undefined,
        logo: logoAan ? logo : null,
      });
    } catch (err) {
      console.error("Word-export mislukt", err);
      setExportFout("Het downloaden lukte niet. Probeer het opnieuw.");
    } finally {
      setExporteren(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* AI-verordening art. 50, vóór de tekst zelf: dit gaat naar ouders en
          de docent blijft degene die hem nakijkt. */}
      <AiMelding />

      {!guardrail.ok && (
        <div className="rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4">
          <p className="text-base font-medium text-fout-tekst">
            Let op: hier staat mogelijk cijfer- of oordeel-taal die niet uit je
            aantekeningen kwam ({guardrail.gevondenWoorden.join(", ")}).
          </p>
          <p className="mt-1 text-base text-tekst">
            Lees de tekst na voordat je hem gebruikt.
          </p>
        </div>
      )}

      <HuisstijlSchakelaars
        huisstijl={huisstijl}
        huisstijlAan={huisstijlAan}
        logoAan={logoAan}
        onHuisstijl={setHuisstijlAan}
        onLogo={setLogoAan}
      />

      {/*
        De voorvertoning draagt de kleuren die straks ook in het Word-bestand
        komen. Inline stijlen, want deze kleuren komen uit de database en niet
        uit het design-systeem; de contrastcheck op /app/huisstijl garandeert
        dat ze leesbaar zijn.
      */}
      <article className="rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
        <div className="flex items-start justify-between gap-4">
          <h2
            className="font-display text-xl"
            style={{ color: huisstijlAan ? huisstijl.accent : undefined }}
          >
            {OUTPUT_LABEL[rapport.input.outputType]} voor {rapport.input.leerlingLabel}
          </h2>
          {logoAan && huisstijl.logoPath && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/api/huisstijl/logo"
              alt="Je schoollogo"
              className="h-10 w-auto shrink-0 object-contain"
            />
          )}
        </div>
        {huisstijlAan && huisstijl.schoolnaam && (
          <p className="mt-1 text-base text-tekst-zacht">{huisstijl.schoolnaam}</p>
        )}
        <textarea aria-label="Rapporttekst bewerken" value={tekst} onChange={(event) => setTekst(event.target.value)} rows={12} className="mt-4 min-h-64 w-full rounded-lg border-2 border-lijn bg-ivoor px-4 py-3 font-sans text-base leading-relaxed text-tekst focus:border-marine focus:outline-none focus:ring-2 focus:ring-marine" />
        <p className="mt-4 text-base text-tekst-zacht">{TRANSPARANTIE} <Link href="/privacy/rapport-module" className="font-semibold text-marine underline">Lees de privacy-uitleg</Link>.</p>
      </article>

      <div className="rounded-xl border-2 border-lijn bg-ivoor px-5 py-4" aria-live="polite">
        <p className="text-base font-semibold text-marine">Controle voor gebruik</p>
        <p className="mt-1 text-base text-tekst">{kwaliteit.ok ? "De belangrijkste controles zijn in orde." : "Kijk deze punten na voordat je de tekst gebruikt."}</p>
        {kwaliteit.checks.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-tekst">{kwaliteit.checks.map((check) => <li key={`${check.kind}-${check.melding}`}>{check.melding}</li>)}</ul>}
      </div>

      {exportFout && <ErrorNotice melding={exportFout} />}

      <fieldset className="rounded-xl border-2 border-lijn bg-ivoor px-5 py-4">
        <legend className="text-base font-semibold text-marine">Coachcheck voor kopiëren</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {CHECKS.map((label, index) => <label key={label} className="flex min-h-11 items-center gap-2 text-base text-tekst"><input type="checkbox" checked={checks[index]} onChange={(e) => setChecks(checks.map((value, i) => i === index ? e.target.checked : value))} className="h-5 w-5" />{label}</label>)}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={handleCopy}>
          {gekopieerd ? "Gekopieerd ✓" : "Kopieer de tekst"}
        </Button>
        <Button onClick={exporteerNaarWord} disabled={exporteren || exportGeblokkeerd} aria-busy={exporteren} aria-describedby={exportHintId}>
          {exporteren ? "Bezig met downloaden..." : "Download als Word"}
        </Button>
        {extraActie}
      </div>

      <p id={exportHintId} aria-live="polite" className="text-base text-tekst-zacht">
        {kwaliteit.checks.find((check) => check.niveau === "blokkade")?.melding ?? "Download als Word wordt beschikbaar nadat alle coachchecks zijn aangevinkt en harde waarschuwingen zijn opgelost."}
      </p>

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
  );
}
