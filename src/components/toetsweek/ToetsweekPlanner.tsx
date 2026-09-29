"use client";

import { useMemo, useState } from "react";
import {
  STANDAARD_INSTELLINGEN,
  nieuwToetsItem,
  type ToetsItem,
  type ToetsweekInstellingen,
} from "@/lib/toetsweek/types";
import {
  analyseerPerKlasPerWeek,
  berekenNakijkplanning,
  genereerSignalen,
} from "@/lib/toetsweek/planner";
import { privacyToetsweek } from "@/lib/toetsweek/export";
import { InvoerTab } from "./InvoerTab";
import { OverzichtTab } from "./OverzichtTab";
import { NakijkplanningTab } from "./NakijkplanningTab";
import { ExportTab } from "./ExportTab";

const TABS = [
  { id: "invoer", label: "Toetsen invoeren" },
  { id: "overzicht", label: "Overzicht per klas" },
  { id: "nakijkplanning", label: "Nakijkplanning" },
  { id: "export", label: "Exporteren" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function voorbeelditems(): ToetsItem[] {
  return [
    {
      ...nieuwToetsItem("H4a"),
      id: "voorbeeld-1",
      vak: "wiskunde",
      soort: "toets",
      datum: "2026-10-06",
      aantalLeerlingen: 26,
      nakijkminuten: 8,
      cijferdeadline: "2026-10-20",
    },
    {
      ...nieuwToetsItem("H4a"),
      id: "voorbeeld-2",
      vak: "natuurkunde",
      soort: "so",
      datum: "2026-10-06",
      aantalLeerlingen: 26,
      nakijkminuten: 4,
      cijferdeadline: "2026-10-13",
    },
    {
      ...nieuwToetsItem("H4b"),
      id: "voorbeeld-3",
      vak: "geschiedenis",
      soort: "praktische opdracht",
      datum: "2026-10-08",
      aantalLeerlingen: 24,
      nakijkminuten: 15,
      cijferdeadline: "2026-10-27",
    },
  ];
}

export function ToetsweekPlanner() {
  const [tab, setTab] = useState<TabId>("invoer");
  const [items, setItems] = useState<ToetsItem[]>([]);
  const [instellingen, setInstellingen] = useState<ToetsweekInstellingen>(
    STANDAARD_INSTELLINGEN,
  );

  const analyses = useMemo(
    () => analyseerPerKlasPerWeek(items, instellingen),
    [items, instellingen],
  );
  const signalen = useMemo(
    () => genereerSignalen(items, instellingen),
    [items, instellingen],
  );
  const nakijkplanning = useMemo(
    () => berekenNakijkplanning(items, instellingen),
    [items, instellingen],
  );
  const privacy = useMemo(() => privacyToetsweek(items), [items]);

  function focusTab(volgendeIndex: number) {
    const index = (volgendeIndex + TABS.length) % TABS.length;
    const volgende = TABS[index];
    setTab(volgende.id);
    document.getElementById(`toetsweek-tab-${volgende.id}`)?.focus();
  }

  function onTabKeyDown(event: React.KeyboardEvent, huidigeIndex: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(huidigeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(huidigeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(TABS.length - 1);
    }
  }

  return (
    <div
      className={`toetsweek-root mx-auto max-w-5xl space-y-8${privacy.blokkeer ? " privacy-blokkeer" : ""}`}
    >
      <style>{`@media print {
        .app-balk { display: none; }
        .toetsweek-print-blokkade { display: none; }
        .toetsweek-root.privacy-blokkeer > * { display: none !important; }
        .toetsweek-root.privacy-blokkeer .toetsweek-print-blokkade { display: block !important; }
      }`}</style>
      <p className="toetsweek-print-blokkade hidden text-lg">
        Printen is geblokkeerd. Verwijder eerst namen of contactgegevens uit de toetsnaam of notitie.
      </p>
      <header className="print:hidden">
        <p className="text-base font-semibold text-marine">Facula · Toetsweek</p>
        <h1 className="mt-2 font-display text-4xl text-marine">Toetsweekplanner</h1>
        <p className="mt-3 max-w-2xl text-lg text-tekst-zacht">
          Zie in één oogopslag welke klas een drukke toetsweek heeft, en plan je
          nakijktijd terug vanaf de cijferdeadline. Gegevens blijven alleen in
          dit tabblad.
        </p>
      </header>
      <nav
        role="tablist"
        aria-label="Onderdeel toetsweekplanner"
        className="flex flex-wrap gap-2 print:hidden"
      >
        {TABS.map(({ id, label }, index) => (
          <button
            type="button"
            role="tab"
            key={id}
            id={`toetsweek-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`toetsweek-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={[
              "min-h-11 rounded-full border-2 px-4 font-semibold",
              "focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-marine focus-visible:ring-offset-2",
              tab === id
                ? "border-marine bg-marine text-op-donker"
                : "border-lijn text-tekst",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </nav>
      <div
        role="tabpanel"
        id={`toetsweek-panel-${tab}`}
        aria-labelledby={`toetsweek-tab-${tab}`}
      >
        {tab === "invoer" && (
          <InvoerTab
            items={items}
            setItems={setItems}
            instellingen={instellingen}
            setInstellingen={setInstellingen}
            vulVoorbeeldIn={() => setItems(voorbeelditems())}
          />
        )}
        {tab === "overzicht" && <OverzichtTab analyses={analyses} signalen={signalen} />}
        {tab === "nakijkplanning" && (
          <NakijkplanningTab items={items} nakijkplanning={nakijkplanning} />
        )}
        {tab === "export" && (
          <ExportTab
            items={items}
            analyses={analyses}
            signalen={signalen}
            nakijkplanning={nakijkplanning}
            privacy={privacy}
          />
        )}
      </div>
    </div>
  );
}
