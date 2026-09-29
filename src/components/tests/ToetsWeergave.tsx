"use client";

import { useState, type ReactNode } from "react";
import type { GeneratedTest } from "@/lib/types";
import { downloadToetsDocx } from "@/lib/docx-export";
import { useHuisstijl, useLogoKeuze } from "@/lib/huisstijl/client";
import { STANDAARD_HUISSTIJL } from "@/lib/huisstijl/themes";
import { HuisstijlSchakelaars } from "@/components/huisstijl/HuisstijlSchakelaars";
import { AiMelding } from "@/components/ui/AiMelding";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/Notice";

/**
 * De gemaakte toets: voorvertoning eerst, dan de download.
 *
 * Stond eerder als lokale functie in /app/tests/new en was daarmee alleen te
 * zien in de seconden na het genereren. Een toets die je een week later
 * terugzoekt hoort er precies zo uit te zien, dus staat de weergave nu hier en
 * gebruiken /app/tests/new en /app/tests/[id] hem allebei.
 *
 * De huisstijl, het logo en het downloaden zitten in dit component en niet in
 * de pagina's: dat is precies het stukje dat op beide plekken hetzelfde moet
 * werken, en het was de plek waar de twee schermen uit elkaar konden lopen.
 */
export function ToetsWeergave({
  toets,
  extraActie,
}: {
  toets: GeneratedTest;
  /** Een tweede, secundaire actie naast de download. */
  extraActie?: ReactNode;
}) {
  const { huisstijl, logo } = useHuisstijl();
  const [huisstijlAan, setHuisstijlAan] = useState(false);
  const [logoAan, setLogoAan] = useLogoKeuze(huisstijl);
  const [exporteren, setExporteren] = useState(false);
  const [exportFout, setExportFout] = useState<string | null>(null);

  const stijl = huisstijlAan ? huisstijl : STANDAARD_HUISSTIJL;
  const logoUrl = logoAan && huisstijl.logoPath ? "/api/huisstijl/logo" : null;

  async function exporteerNaarWord() {
    setExporteren(true);
    setExportFout(null);
    try {
      await downloadToetsDocx(toets, {
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
    <div className="stap-fade mx-auto max-w-3xl">
      <article className="space-y-8">
        {/*
          De kop staat in de kleuren die straks ook in het Word-bestand komen,
          zodat de docent vóór de download ziet wat hij krijgt. Vandaar inline
          stijlen en geen klassen: deze kleuren komen uit de database en niet
          uit het design-systeem. `op-donker` blijft erop voor de focusring,
          en de contrastcheck op /app/huisstijl garandeert dat de tekst hier
          leesbaar is, ongeacht welke kleuren er gekozen zijn.
        */}
        <header
          className="op-donker rounded-2xl border-2 p-8"
          style={{ backgroundColor: stijl.accent, borderColor: stijl.accent }}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="text-base font-semibold uppercase tracking-[0.2em] text-op-donker-zacht">
              {toets.input.vak} · {toets.input.niveau} {toets.input.leerjaar}
            </p>
            {logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Je schoollogo"
                className="h-10 w-auto shrink-0 rounded bg-ivoor object-contain p-1"
              />
            )}
          </div>
          <h2 className="mt-3 font-display text-3xl">{toets.titel}</h2>
          <p className="mt-3 text-base text-op-donker-zacht">
            {toets.vragen.length} vragen · {toets.totaalPunten} punten · circa{" "}
            {toets.tijdsduur} minuten
          </p>
          {stijl.schoolnaam && (
            <p className="mt-2 text-base text-op-donker-zacht">{stijl.schoolnaam}</p>
          )}
        </header>

        {/* AI-verordening art. 50, boven de downloadknop. */}
        <AiMelding />

        <HuisstijlSchakelaars
          huisstijl={huisstijl}
          huisstijlAan={huisstijlAan}
          logoAan={logoAan}
          onHuisstijl={setHuisstijlAan}
          onLogo={setLogoAan}
        />

        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={exporteerNaarWord}
            disabled={exporteren}
            aria-busy={exporteren}
          >
            {exporteren ? "Bezig met downloaden..." : "Download als Word"}
          </Button>
          {extraActie}
        </div>

        {exportFout && (
          <ErrorNotice
            melding={exportFout}
            actie={
              <Button variant="secondary" onClick={exporteerNaarWord}>
                Probeer opnieuw
              </Button>
            }
          />
        )}

        <div className="rounded-2xl border-2 border-lijn bg-ivoor p-8">
          <h3 className="font-display text-2xl text-marine">De vragen</h3>
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
          <h3 className="font-display text-2xl text-marine">De antwoorden</h3>
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
