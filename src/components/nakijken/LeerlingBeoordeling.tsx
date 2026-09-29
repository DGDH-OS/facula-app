"use client";

import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { berekenCijfer } from "@/lib/nakijken/rubric";
import { maakFeedback, totaalPunten } from "@/lib/nakijken/feedback";
import type { Leerling, Niveau, Rubric } from "@/lib/nakijken";

export function LeerlingBeoordeling({
  rubric,
  leerlingen,
  setLeerlingen,
  initialen,
  setInitialen,
  kopieer,
  naarOverzicht,
}: {
  rubric: Rubric;
  leerlingen: Leerling[];
  setLeerlingen: React.Dispatch<React.SetStateAction<Leerling[]>>;
  initialen: string;
  setInitialen: (value: string) => void;
  kopieer: (tekst: string) => Promise<void>;
  naarOverzicht: () => void;
}) {
  function voegLeerlingToe() {
    const waarde = initialen.trim();
    if (!waarde) return;
    setLeerlingen((current) => [
      ...current,
      { id: `${Date.now()}`, initialen: waarde, keuzes: {}, notitie: "" },
    ]);
    setInitialen("");
  }
  function kiesNiveau(
    leerlingIndex: number,
    criteriumId: string,
    niveau: Niveau,
  ) {
    setLeerlingen((current) =>
      current.map((leerling, index) =>
        index === leerlingIndex
          ? {
              ...leerling,
              keuzes: { ...leerling.keuzes, [criteriumId]: niveau },
            }
          : leerling,
      ),
    );
  }
  return (
    <section className="space-y-6">
      <div className="rounded-xl border-2 border-lijn bg-ivoor p-5">
        <Field
          label="Leerling toevoegen"
          hulptekst="Gebruik alleen initialen, bijvoorbeeld L.J."
        >
          {(ids) => (
            <input
              {...ids}
              className={VELD_KLASSEN}
              value={initialen}
              onChange={(event) => setInitialen(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && voegLeerlingToe()}
            />
          )}
        </Field>
        <Button className="mt-3" onClick={voegLeerlingToe}>
          Leerling toevoegen
        </Button>
      </div>
      {leerlingen.map((leerling, leerlingIndex) => (
        <article
          key={leerling.id}
          className="rounded-xl border-2 border-lijn bg-ivoor p-5"
        >
          <h2 className="font-display text-2xl text-marine">
            {leerling.initialen}
          </h2>
          {rubric.criteria.map((criterium) => (
            <fieldset key={criterium.id} className="mt-5">
              <legend className="text-base font-semibold text-marine">
                {criterium.naam}
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                {criterium.niveaus.map((niveau, niveauIndex) => (
                  <button
                    type="button"
                    key={niveauIndex}
                    aria-label={`${criterium.naam}: ${niveau.label}`}
                    onClick={() =>
                      kiesNiveau(
                        leerlingIndex,
                        criterium.id,
                        (niveauIndex + 1) as Niveau,
                      )
                    }
                    onKeyDown={(event) => {
                      const gekozen = Number(event.key);
                      if (gekozen >= 1 && gekozen <= criterium.niveaus.length) {
                        kiesNiveau(
                          leerlingIndex,
                          criterium.id,
                          gekozen as Niveau,
                        );
                      }
                    }}
                    className={`min-h-14 rounded-lg border-2 p-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-marine ${leerling.keuzes[criterium.id] === niveauIndex + 1 ? "border-marine bg-marine text-op-donker" : "border-lijn text-marine"}`}
                  >
                    <span className="block text-lg">{niveauIndex + 1}</span>
                    {niveau.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-base text-tekst-zacht">
                {leerling.keuzes[criterium.id]
                  ? criterium.niveaus[leerling.keuzes[criterium.id] - 1]
                      .descriptor
                  : "Kies een niveau."}
              </p>
            </fieldset>
          ))}
          <label
            className="mt-5 block text-base font-semibold text-marine"
            htmlFor={`notitie-${leerling.id}`}
          >
            Korte notitie, optioneel
          </label>
          <textarea
            id={`notitie-${leerling.id}`}
            className={`${VELD_KLASSEN} mt-2`}
            rows={3}
            value={leerling.notitie}
            onChange={(event) =>
              setLeerlingen((current) =>
                current.map((item, index) =>
                  index === leerlingIndex
                    ? { ...item, notitie: event.target.value }
                    : item,
                ),
              )
            }
          />
          <p className="mt-3 text-base font-semibold text-marine">
            Punten: {totaalPunten(rubric, leerling)} / {rubric.maxPunten}
            {rubric.cesuur
              ? ` · cijfer ${berekenCijfer(totaalPunten(rubric, leerling), rubric.maxPunten, rubric.cesuur)} (berekend uit jouw punten)`
              : ""}
          </p>
          <Button
            className="mt-3"
            onClick={() => kopieer(maakFeedback(rubric, leerling))}
          >
            Kopieer feedback
          </Button>
        </article>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() =>
            kopieer(
              leerlingen
                .map(
                  (leerling) =>
                    `${leerling.initialen}\n${maakFeedback(rubric, leerling)}`,
                )
                .join("\n\n"),
            )
          }
          disabled={!leerlingen.length}
        >
          Kopieer alles
        </Button>
        <Button onClick={naarOverzicht}>Bekijk klas-overzicht</Button>
      </div>
    </section>
  );
}
