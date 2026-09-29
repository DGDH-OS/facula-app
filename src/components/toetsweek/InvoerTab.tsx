"use client";

import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import {
  STANDAARD_NAKIJKMINUTEN,
  TOETS_SOORTEN,
  dupliceerToetsItem,
  nieuwToetsItem,
  type ToetsItem,
  type ToetsweekInstellingen,
} from "@/lib/toetsweek/types";
import {
  standaardCijferdeadline,
  valideerItem,
  foutmelding,
  type ItemFout,
} from "@/lib/toetsweek/planner";

const WEEKDAGEN = [
  { index: 0, label: "zondag" },
  { index: 1, label: "maandag" },
  { index: 2, label: "dinsdag" },
  { index: 3, label: "woensdag" },
  { index: 4, label: "donderdag" },
  { index: 5, label: "vrijdag" },
  { index: 6, label: "zaterdag" },
];

function ToetsRij({
  item,
  instellingen,
  bijwerken,
  dupliceren,
  verwijderen,
}: {
  item: ToetsItem;
  instellingen: ToetsweekInstellingen;
  bijwerken: (wijziging: Partial<ToetsItem>) => void;
  dupliceren: () => void;
  verwijderen: () => void;
}) {
  const fouten = valideerItem(item);
  const foutBij = (soort: ItemFout) => (fouten.includes(soort) ? foutmelding(soort) : null);

  return (
    <article className="space-y-4 rounded-xl border-2 border-lijn bg-ivoor p-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Klas" verplicht>
          {(ids) => (
            <input
              {...ids}
              className={VELD_KLASSEN}
              value={item.klas}
              onChange={(event) => bijwerken({ klas: event.target.value })}
            />
          )}
        </Field>
        <Field label="Vak" verplicht>
          {(ids) => (
            <input
              {...ids}
              className={VELD_KLASSEN}
              value={item.vak}
              onChange={(event) => bijwerken({ vak: event.target.value })}
            />
          )}
        </Field>
        <Field label="Soort">
          {(ids) => (
            <select
              {...ids}
              className={VELD_KLASSEN}
              value={item.soort}
              onChange={(event) => {
                const soort = event.target.value as ToetsItem["soort"];
                bijwerken({ soort, nakijkminuten: STANDAARD_NAKIJKMINUTEN[soort] });
              }}
            >
              {TOETS_SOORTEN.map((soort) => (
                <option key={soort} value={soort}>
                  {soort}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Datum" verplicht fout={foutBij("datum-ongeldig")}>
          {(ids) => (
            <input
              {...ids}
              type="date"
              className={VELD_KLASSEN}
              value={item.datum}
              onChange={(event) => bijwerken({ datum: event.target.value })}
            />
          )}
        </Field>
        <Field label="Naam of omschrijving" hulptekst="Optioneel.">
          {(ids) => (
            <input
              {...ids}
              className={VELD_KLASSEN}
              value={item.naam}
              onChange={(event) => bijwerken({ naam: event.target.value })}
            />
          )}
        </Field>
        <Field
          label="Aantal leerlingen"
          verplicht
          fout={foutBij("leerlingen-ongeldig")}
        >
          {(ids) => (
            <input
              {...ids}
              type="number"
              min={1}
              className={VELD_KLASSEN}
              value={item.aantalLeerlingen}
              onChange={(event) =>
                bijwerken({ aantalLeerlingen: Number(event.target.value) })
              }
            />
          )}
        </Field>
        <Field label="Nakijkminuten per leerling">
          {(ids) => (
            <input
              {...ids}
              type="number"
              min={1}
              className={VELD_KLASSEN}
              value={item.nakijkminuten}
              onChange={(event) =>
                bijwerken({ nakijkminuten: Number(event.target.value) })
              }
            />
          )}
        </Field>
        <Field
          label="Cijferdeadline"
          hulptekst="Leeg is 10 werkdagen na de toetsdatum."
          fout={
            foutBij("cijferdeadline-ongeldig") ?? foutBij("cijferdeadline-voor-datum")
          }
        >
          {(ids) => (
            <input
              {...ids}
              type="date"
              className={VELD_KLASSEN}
              value={item.cijferdeadline}
              onChange={(event) => bijwerken({ cijferdeadline: event.target.value })}
            />
          )}
        </Field>
      </div>
      <Field label="Notitie" hulptekst="Optioneel. Gebruik geen namen of contactgegevens.">
        {(ids) => (
          <textarea
            {...ids}
            rows={2}
            className={VELD_KLASSEN}
            value={item.notitie}
            onChange={(event) => bijwerken({ notitie: event.target.value })}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-3">
        {item.datum && (
          <Button
            onClick={() =>
              bijwerken({ cijferdeadline: standaardCijferdeadline(item.datum, instellingen) })
            }
          >
            Zet standaard cijferdeadline
          </Button>
        )}
        <Button onClick={dupliceren}>Rij dupliceren</Button>
        <Button onClick={verwijderen}>Rij verwijderen</Button>
      </div>
    </article>
  );
}

function InstellingenFieldset({
  instellingen,
  setInstellingen,
}: {
  instellingen: ToetsweekInstellingen;
  setInstellingen: (instellingen: ToetsweekInstellingen) => void;
}) {
  function toggleVrijeWeekdag(index: number) {
    const actief = instellingen.vrijeWeekdagen.includes(index);
    const vrijeWeekdagen = actief
      ? instellingen.vrijeWeekdagen.filter((dag) => dag !== index)
      : [...instellingen.vrijeWeekdagen, index];
    setInstellingen({ ...instellingen, vrijeWeekdagen });
  }

  function voegExtraVrijeDagToe(datum: string) {
    if (!datum || instellingen.extraVrijeDatums.includes(datum)) return;
    setInstellingen({
      ...instellingen,
      extraVrijeDatums: [...instellingen.extraVrijeDatums, datum].sort(),
    });
  }

  function verwijderExtraVrijeDag(datum: string) {
    setInstellingen({
      ...instellingen,
      extraVrijeDatums: instellingen.extraVrijeDatums.filter((dag) => dag !== datum),
    });
  }

  return (
    <details className="rounded-xl border-2 border-lijn bg-ivoor p-5">
      <summary className="cursor-pointer text-lg font-semibold text-marine">
        Instellingen
      </summary>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <Field
          label="Nakijkminuten per dag"
          hulptekst="Hoeveel minuten nakijktijd je gemiddeld per dag beschikbaar hebt."
        >
          {(ids) => (
            <input
              {...ids}
              type="number"
              min={1}
              className={VELD_KLASSEN}
              value={instellingen.nakijkminutenPerDag}
              onChange={(event) =>
                setInstellingen({
                  ...instellingen,
                  nakijkminutenPerDag: Number(event.target.value),
                })
              }
            />
          )}
        </Field>
        <fieldset>
          <legend className="block text-base font-semibold text-marine">
            Vrije dagen, niet nakijken
          </legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {WEEKDAGEN.map(({ index, label }) => (
              <label key={index} className="flex min-h-11 items-center gap-2 text-base">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={instellingen.vrijeWeekdagen.includes(index)}
                  onChange={() => toggleVrijeWeekdag(index)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          label="Grens 'druk' per klas per week"
          hulptekst="Gewogen belasting vanaf waar een week als druk geldt."
        >
          {(ids) => (
            <input
              {...ids}
              type="number"
              min={0.5}
              step={0.5}
              className={VELD_KLASSEN}
              value={instellingen.drukGrens}
              onChange={(event) =>
                setInstellingen({ ...instellingen, drukGrens: Number(event.target.value) })
              }
            />
          )}
        </Field>
        <Field
          label="Grens 'te druk' per klas per week"
          hulptekst="Gewogen belasting vanaf waar een week als te druk geldt."
        >
          {(ids) => (
            <input
              {...ids}
              type="number"
              min={0.5}
              step={0.5}
              className={VELD_KLASSEN}
              value={instellingen.teDrukGrens}
              onChange={(event) =>
                setInstellingen({ ...instellingen, teDrukGrens: Number(event.target.value) })
              }
            />
          )}
        </Field>
      </div>
      <p className="mt-4 text-base text-tekst-zacht">
        Piekzwaarte per soort: een toets, praktische opdracht of mondeling weegt 1, een so
        of inleverdeadline weegt 0,5. Een week met twee toetsen weegt dus even zwaar als
        een week met vier so&apos;s.
      </p>
      <div className="mt-4">
        <Field label="Extra vrije datum toevoegen" hulptekst="Bijvoorbeeld een vakantiedag.">
          {(ids) => (
            <input
              {...ids}
              type="date"
              className={VELD_KLASSEN}
              onChange={(event) => {
                voegExtraVrijeDagToe(event.target.value);
                event.target.value = "";
              }}
            />
          )}
        </Field>
        {instellingen.extraVrijeDatums.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {instellingen.extraVrijeDatums.map((datum) => (
              <li key={datum}>
                <button
                  type="button"
                  onClick={() => verwijderExtraVrijeDag(datum)}
                  className="min-h-11 rounded-full border-2 border-marine px-4 text-base"
                >
                  {datum} verwijderen
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export function InvoerTab({
  items,
  setItems,
  instellingen,
  setInstellingen,
  vulVoorbeeldIn,
}: {
  items: ToetsItem[];
  setItems: (items: ToetsItem[]) => void;
  instellingen: ToetsweekInstellingen;
  setInstellingen: (instellingen: ToetsweekInstellingen) => void;
  vulVoorbeeldIn: () => void;
}) {
  const aantalMetFout = items.filter((item) => valideerItem(item).length > 0).length;

  function bijwerken(id: string, wijziging: Partial<ToetsItem>) {
    setItems(items.map((item) => (item.id === id ? { ...item, ...wijziging } : item)));
  }

  function dupliceren(item: ToetsItem) {
    setItems([...items, dupliceerToetsItem(item)]);
  }

  function verwijderen(id: string) {
    setItems(items.filter((item) => item.id !== id));
  }

  return (
    <section className="space-y-6">
      <InstellingenFieldset instellingen={instellingen} setInstellingen={setInstellingen} />
      <div className="space-y-4">
        {items.map((item) => (
          <ToetsRij
            key={item.id}
            item={item}
            instellingen={instellingen}
            bijwerken={(wijziging) => bijwerken(item.id, wijziging)}
            dupliceren={() => dupliceren(item)}
            verwijderen={() => verwijderen(item.id)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" onClick={() => setItems([...items, nieuwToetsItem()])}>
          Rij toevoegen
        </Button>
        <Button onClick={vulVoorbeeldIn}>Vul voorbeeld in</Button>
      </div>
      {items.length > 0 && (
        <p role="status" aria-live="polite" className="text-base text-tekst-zacht">
          {aantalMetFout > 0
            ? `${aantalMetFout} ${aantalMetFout === 1 ? "rij heeft" : "rijen hebben"} nog een fout.`
            : `Alle ${items.length} rijen zijn geldig.`}
        </p>
      )}
    </section>
  );
}
