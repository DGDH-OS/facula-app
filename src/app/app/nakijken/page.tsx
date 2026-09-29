"use client";

import { useMemo, useState } from "react";
import { controleerNakijkenPrivacy } from "@/lib/report-quality";
import { klasSignalen, maakFeedback } from "@/lib/nakijken/feedback";
import { nieuwCriterium } from "@/lib/nakijken/rubric";
import type { Leerling, Rubric } from "@/lib/nakijken";
import { RubricBouwer } from "@/components/nakijken/RubricBouwer";
import { LeerlingBeoordeling } from "@/components/nakijken/LeerlingBeoordeling";
import { KlasOverzicht } from "@/components/nakijken/KlasOverzicht";
import { exporteerWordDocument, tekstVoorWordExport } from "@/components/nakijken/NakijkExport";

const basis: Rubric = {
  titel: "",
  criteria: [nieuwCriterium("Inhoud"), nieuwCriterium("Opbouw")],
  maxPunten: 12,
  cesuur: null,
};
type Tab = "rubric" | "nakijken" | "overzicht";

export default function NakijkenPage() {
  const [rubric, setRubric] = useState<Rubric>(basis);
  const [leerlingen, setLeerlingen] = useState<Leerling[]>([]);
  const [initialen, setInitialen] = useState("");
  const [tab, setTab] = useState<Tab>("rubric");
  const [melding, setMelding] = useState("");
  const actueleLeerlingen = useMemo(() => leerlingen.map((leerling) => ({
      ...leerling,
      keuzes: Object.fromEntries(Object.entries(leerling.keuzes).filter(([id, niveau]) => {
        const criterium = rubric.criteria.find((item) => item.id === id);
        return Boolean(criterium?.niveaus[niveau - 1]);
      })) as Leerling["keuzes"],
    })), [rubric, leerlingen]);
  const signalen = useMemo(() => klasSignalen(rubric, actueleLeerlingen), [rubric, actueleLeerlingen]);
  const wordPrivacy = controleerNakijkenPrivacy(tekstVoorWordExport(rubric, actueleLeerlingen));

  async function kopieer(tekst: string) {
    const privacy = controleerNakijkenPrivacy(tekst);
    if (privacy.blokkeer) {
      setMelding(
        `Kopiëren geblokkeerd: verwijder ${privacy.redenen.join(" en ")}.`,
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(tekst);
      setMelding("Gekopieerd.");
    } catch {
      setMelding(
        "Kopiëren lukte niet. Selecteer de tekst en kopieer hem zelf.",
      );
    }
  }
  async function exporteer() {
    await kopieer(
      leerlingen
        .map(
          (leerling) =>
            `${leerling.initialen}\n${maakFeedback(rubric, leerling)}`,
        )
        .join("\n\n"),
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-base font-semibold text-marine">
          Facula · Nakijkhulp
        </p>
        <h1 className="mt-2 font-display text-4xl text-marine">
          Sneller nakijken, betere feedback
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-tekst-zacht">
          Werk met een duidelijke rubric en geef iedere leerling een concrete
          volgende stap. Gegevens blijven alleen in dit tabblad.
        </p>
      </header>
      <nav aria-label="Stappen" className="flex flex-wrap gap-2">
        {(
          [
            ["rubric", "1. Rubric"],
            ["nakijken", "2. Nakijken"],
            ["overzicht", "3. Klas-overzicht"],
          ] as const
        ).map(([id, label]) => (
          <button
            type="button"
            key={id}
            onClick={() => setTab(id)}
            className={`min-h-11 rounded-full border-2 px-4 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-marine ${tab === id ? "border-marine bg-marine text-op-donker" : "border-lijn text-marine"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "rubric" && (
        <RubricBouwer
          rubric={rubric}
          setRubric={setRubric}
          setMelding={setMelding}
          naarNakijken={() => setTab("nakijken")}
        />
      )}
      {tab === "nakijken" && (
        <LeerlingBeoordeling
          rubric={rubric}
          leerlingen={actueleLeerlingen}
          setLeerlingen={setLeerlingen}
          initialen={initialen}
          setInitialen={setInitialen}
          kopieer={kopieer}
          naarOverzicht={() => setTab("overzicht")}
        />
      )}
      {tab === "overzicht" && (
        <KlasOverzicht
          rubric={rubric}
          leerlingen={actueleLeerlingen}
          signalen={signalen}
          exporteer={exporteer}
          exporteerWord={async () => {
            const privacy = await exporteerWordDocument(rubric, actueleLeerlingen);
            setMelding(privacy.blokkeer ? `Word-export geblokkeerd: verwijder ${privacy.redenen.join(" en ")}.` : "Word-bestand gedownload.");
          }}
          wordExportBlokkade={wordPrivacy.blokkeer ? `Word-export geblokkeerd: verwijder ${wordPrivacy.redenen.join(" en ")}.` : null}
          wisAlles={() => setLeerlingen([])}
        />
      )}
      {melding && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl border-2 border-lijn bg-neutraal-vlak p-4 text-base"
        >
          {melding}
        </p>
      )}
      <p className="text-base text-tekst-zacht">
        Gebruik alleen initialen. Gegevens blijven alleen in dit tabblad en
        verdwijnen bij sluiten of vernieuwen.
      </p>
    </div>
  );
}
