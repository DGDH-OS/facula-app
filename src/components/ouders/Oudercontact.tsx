"use client";
import { useState } from "react";
import {
  AANLEIDINGEN,
  type Aanleiding,
  type MailInput,
} from "@/lib/ouders/templates";
import { MailTab } from "./MailTab";
import { GesprekTab } from "./GesprekTab";
import { VerslagTab } from "./VerslagTab";
import { focusRingClass } from "./Veld";
import type { GesprekInput } from "@/lib/ouders/gesprek";
import type { VerslagInput } from "@/lib/ouders/verslag";

const TABS = [
  { id: "mail", label: "Oudermail" },
  { id: "gesprek", label: "Gesprek voorbereiden" },
  { id: "verslag", label: "Verslag" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Oudercontact() {
  const [tab, setTab] = useState<TabId>("mail");
  const [mail, setMail] = useState<MailInput>({
    aanleiding: AANLEIDINGEN[0] as Aanleiding,
    aanhef: "Beste ouder(s)/verzorger(s)",
    leerling: "",
    vak: "",
    observatie: "",
    observatie2: "",
    actie: "",
    toon: "vriendelijk",
    lengte: "normaal",
    naam: "",
    datum: "",
    locatie: "",
    tijd: "",
    meenemen: "",
    belmomenten: "",
  });
  const [gesprek, setGesprek] = useState<GesprekInput>({
    doel: "",
    sterk: ["", "", ""],
    aandacht: ["", ""],
    vraag: "",
    afspraak: "",
    minuten: 10,
  });
  const [verslag, setVerslag] = useState<VerslagInput>({
    datum: "",
    aanwezigen: "ouder/verzorger en docent",
    besproken: "",
    afspraken: [],
    vervolg: "",
  });
  function focusTab(volgendeIndex: number) {
    const index = (volgendeIndex + TABS.length) % TABS.length;
    const volgende = TABS[index];
    setTab(volgende.id);
    document.getElementById(`tab-${volgende.id}`)?.focus();
  }

  function onTabKeyDown(event: React.KeyboardEvent, huidigeIndex: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(huidigeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(huidigeIndex - 1);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <style>{`@media print { .app-balk { display: none; } }`}</style>
      <header className="print:hidden">
        <p className="font-semibold text-marine">Facula · Oudercontact</p>
        <h1 className="mt-2 font-display text-4xl text-marine">
          Minder tijd aan oudercommunicatie
        </h1>
      </header>
      <nav
        role="tablist"
        aria-label="Onderdeel oudercontact"
        className="flex flex-wrap gap-2 print:hidden"
      >
        {TABS.map(({ id, label }, index) => (
          <button
            type="button"
            role="tab"
            key={id}
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={`min-h-11 rounded-full border-2 px-4 font-semibold ${focusRingClass} ${
              tab === id
                ? "border-marine bg-marine text-op-donker"
                : "border-lijn text-tekst"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "mail" && <MailTab mail={mail} setMail={setMail} />}
        {tab === "gesprek" && (
          <GesprekTab state={gesprek} setState={setGesprek} />
        )}
        {tab === "verslag" && (
          <VerslagTab
            state={verslag}
            setState={setVerslag}
            onMailSamenvatting={(samenvatting) => {
              setMail({
                ...mail,
                aanleiding: "Terugkoppeling na gesprek",
                observatie: samenvatting.observatie,
                actie: samenvatting.actie,
              });
              setTab("mail");
            }}
          />
        )}
      </div>
      <aside className="rounded-xl border-2 border-lijn bg-neutraal-vlak p-5 print:hidden">
        <h2 className="font-display text-2xl text-marine">
          Check voor verzenden
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Staat er een concreet, zichtbaar feit?</li>
          <li>Gebruik je geen oordeel of diagnose?</li>
          <li>Staat er één duidelijke actie?</li>
          <li>Kun je de tekst rustig hardop lezen?</li>
          <li>Staat er een concreet aanbod om contact op te nemen?</li>
        </ul>
        <p className="mt-4 text-tekst-zacht">
          Gegevens blijven alleen in dit tabblad. Plak de tekst zelf in
          Magister, Somtoday of je mail.
        </p>
      </aside>
    </div>
  );
}
