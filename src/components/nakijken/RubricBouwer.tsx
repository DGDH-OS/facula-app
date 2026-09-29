"use client";

import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import {
  STARTERS,
  nieuwCriterium,
  valideerRubric,
} from "@/lib/nakijken/rubric";
import type { Rubric } from "@/lib/nakijken";

export function RubricBouwer({
  rubric,
  setRubric,
  setMelding,
  naarNakijken,
}: {
  rubric: Rubric;
  setRubric: React.Dispatch<React.SetStateAction<Rubric>>;
  setMelding: (melding: string) => void;
  naarNakijken: () => void;
}) {
  function updateCriterium(index: number, naam: string) {
    setRubric((current) => ({
      ...current,
      criteria: current.criteria.map((criterium, i) =>
        i === index ? { ...criterium, naam } : criterium,
      ),
    }));
  }
  function selecteerStarter(naam: string) {
    const starter = STARTERS[naam];
    if (starter)
      setRubric((current) => ({
        ...current,
        titel: starter.titel,
        criteria: starter.criteria.map((criterium) =>
          nieuwCriterium(criterium.naam, criterium),
        ),
      }));
  }
  return (
    <section className="space-y-6">
      <div className="rounded-xl border-2 border-lijn bg-ivoor p-5">
        <Field
          label="Opdracht"
          verplicht
          hulptekst="Kies een naam die leerlingen herkennen."
        >
          {(ids) => (
            <input
              {...ids}
              className={VELD_KLASSEN}
              value={rubric.titel}
              onChange={(event) =>
                setRubric({ ...rubric, titel: event.target.value })
              }
            />
          )}
        </Field>
        <label className="mt-5 block text-base font-semibold text-marine">
          Starter gebruiken
        </label>
        <select
          className={VELD_KLASSEN}
          aria-label="Starter gebruiken"
          onChange={(event) => selecteerStarter(event.target.value)}
        >
          <option>Kies een voorbeeld</option>
          {Object.keys(STARTERS).map((naam) => (
            <option key={naam}>{naam}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rubric.criteria.map((criterium, index) => (
          <article
            key={criterium.id}
            className="rounded-xl border-2 border-lijn bg-ivoor p-5"
          >
            <label
              className="block text-base font-semibold text-marine"
              htmlFor={criterium.id}
            >
              Criterium {index + 1}
            </label>
            <input
              id={criterium.id}
              className={VELD_KLASSEN}
              value={criterium.naam}
              onChange={(event) => updateCriterium(index, event.target.value)}
            />
            {criterium.niveaus.map((niveau, niveauIndex) => (
              <div key={niveauIndex} className="mt-3">
                <label className="block text-base font-semibold text-tekst">
                  Niveau {niveauIndex + 1}: {niveau.label}
                </label>
                <input
                  aria-label={`${criterium.naam}, beschrijving niveau ${niveauIndex + 1}`}
                  className={VELD_KLASSEN}
                  value={niveau.descriptor}
                  onChange={(event) =>
                    setRubric({
                      ...rubric,
                      criteria: rubric.criteria.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              niveaus: item.niveaus.map((level, levelIndex) =>
                                levelIndex === niveauIndex
                                  ? { ...level, descriptor: event.target.value }
                                  : level,
                              ),
                            }
                          : item,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </article>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() =>
            setRubric({
              ...rubric,
              criteria: [...rubric.criteria, nieuwCriterium()],
            })
          }
          disabled={rubric.criteria.length >= 6}
        >
          Criterium toevoegen
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            const fouten = valideerRubric(rubric);
            setMelding(fouten[0] ?? "Rubric opgeslagen in dit tabblad.");
            if (!fouten.length) naarNakijken();
          }}
        >
          {rubric.criteria.length}/6 criteria klaar
        </Button>
      </div>
    </section>
  );
}
