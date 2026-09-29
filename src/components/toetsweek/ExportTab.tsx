"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { IcsKeuze } from "@/lib/toetsweek/export";
import {
  downloadICS,
  downloadToetsweekWoord,
  genereerICS,
  privacyToetsweek,
} from "@/lib/toetsweek/export";
import type {
  KlasWeekAnalyse,
  NakijkplanningResultaat,
  ToetsweekSignaal,
} from "@/lib/toetsweek/planner";
import type { ToetsItem } from "@/lib/toetsweek/types";

const ICS_KEUZES: { id: IcsKeuze; label: string }[] = [
  { id: "toetsen", label: "Alleen toetsen en deadlines" },
  { id: "nakijken", label: "Alleen nakijkmomenten" },
  { id: "beide", label: "Beide" },
];

export function ExportTab(props: {
  items: ToetsItem[];
  analyses: KlasWeekAnalyse[];
  signalen: ToetsweekSignaal[];
  nakijkplanning: NakijkplanningResultaat;
  privacy: ReturnType<typeof privacyToetsweek>;
}) {
  const { items, analyses, signalen, nakijkplanning, privacy } = props;
  const [icsKeuze, setIcsKeuze] = useState<IcsKeuze>("beide");
  const [melding, setMelding] = useState("");
  const geblokkeerdeRedenen = privacy.blokkeer
    ? "Exporteren geblokkeerd: verwijder " + privacy.redenen.join(" en ")
      + " uit de toetsnaam of notitie."
    : "";
  const knopKlasse = privacy.blokkeer ? "opacity-50" : "";

  async function exporteerWoord() {
    const resultaat = await downloadToetsweekWoord(
      items,
      analyses,
      signalen,
      nakijkplanning.dagen,
      nakijkplanning.tekorten,
    );
    setMelding(resultaat.blokkeer ? geblokkeerdeRedenen : "Word-bestand gedownload.");
  }

  function print() {
    if (privacy.blokkeer) return;
    window.print();
  }

  function exporteerAgenda() {
    if (privacy.blokkeer) return;
    const inhoud = genereerICS(items, nakijkplanning.dagen, icsKeuze);
    downloadICS(inhoud);
    setMelding("Agendabestand gedownload.");
  }

  return (
    <section className="space-y-6 print:hidden">
      <p className="max-w-2xl text-lg text-tekst-zacht">
        Exporteer het overzicht per klas per week, de signalen en de
        nakijkplanning. Gegevens blijven alleen in dit tabblad.
      </p>
      <p aria-live="polite" className="text-base text-fout-tekst">
        {geblokkeerdeRedenen}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          disabled={privacy.blokkeer}
          aria-disabled={privacy.blokkeer}
          className={knopKlasse}
          onClick={() => void exporteerWoord()}
        >
          Download als Word
        </Button>
        <Button
          disabled={privacy.blokkeer}
          aria-disabled={privacy.blokkeer}
          className={knopKlasse}
          onClick={print}
        >
          Print
        </Button>
      </div>
      <fieldset className="rounded-xl border-2 border-lijn bg-ivoor p-5">
        <legend className="text-lg font-semibold text-marine">Agenda (.ics)</legend>
        <div className="mt-3 flex flex-wrap gap-4">
          {ICS_KEUZES.map(({ id, label }) => (
            <label key={id} className="flex min-h-11 items-center gap-2 text-base">
              <input
                type="radio"
                name="ics-keuze"
                className="h-5 w-5"
                checked={icsKeuze === id}
                onChange={() => setIcsKeuze(id)}
              />
              {label}
            </label>
          ))}
        </div>
        <Button
          className={"mt-4 " + knopKlasse}
          disabled={privacy.blokkeer}
          aria-disabled={privacy.blokkeer}
          onClick={exporteerAgenda}
        >
          Download agenda
        </Button>
      </fieldset>
      {melding && (
        <p role="status" aria-live="polite" className="text-base text-tekst-zacht">
          {melding}
        </p>
      )}
    </section>
  );
}
