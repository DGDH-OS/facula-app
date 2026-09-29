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

const OUTPUT_LABEL: Record<RapportOutputType, string> = {
  rapporttekst: "Rapporttekst",
  oudergesprek: "Verslag oudergesprek",
  oudermail: "Concept oudermail",
};

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rapport.tekst);
      setGekopieerd(true);
      window.setTimeout(() => setGekopieerd(false), 4000);
    } catch {
      // Klembord geweigerd (oudere browser, geen https): de tekst staat er
      // nog, dus de docent kan hem gewoon selecteren.
      setExportFout("Kopiëren lukte niet. Selecteer de tekst en kopieer hem zelf.");
    }
  }

  async function exporteerNaarWord() {
    setExporteren(true);
    setExportFout(null);
    try {
      await downloadRapportDocx(rapport, {
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

      {!rapport.guardrail.ok && (
        <div className="rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4">
          <p className="text-base font-medium text-fout-tekst">
            Let op: hier staat mogelijk cijfer- of oordeel-taal die niet uit je
            aantekeningen kwam ({rapport.guardrail.gevondenWoorden.join(", ")}).
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
        <pre className="mt-4 whitespace-pre-wrap font-sans text-base leading-relaxed text-tekst">
          {rapport.tekst}
        </pre>
      </article>

      {exportFout && <ErrorNotice melding={exportFout} />}

      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={handleCopy}>
          {gekopieerd ? "Gekopieerd ✓" : "Kopieer de tekst"}
        </Button>
        <Button onClick={exporteerNaarWord} disabled={exporteren} aria-busy={exporteren}>
          {exporteren ? "Bezig met downloaden..." : "Download als Word"}
        </Button>
        {extraActie}
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
  );
}
