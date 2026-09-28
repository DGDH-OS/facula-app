"use client";

import { useState } from "react";
import type { LessonPart, LessonSection } from "@/lib/types";
import { Button } from "@/components/ui/Button";

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={spinning ? "animate-spin" : ""}
      aria-hidden
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M13.5 2.5v3h-3" />
    </svg>
  );
}

/**
 * Sleutel van één sectiekaart, met de inhoud erin verwerkt. Verandert de
 * sectie van buitenaf (een versie terugzetten, of een regenerate), dan
 * krijgt de kaart een nieuwe sleutel en dus een verse `draft` uit de
 * props. Zonder dat zou de kaart de oude tekst in zijn lokale state
 * houden en die bij "Bewaar dit onderdeel" over de teruggezette versie
 * heen schrijven.
 */
function sectieSleutel(sectionIndex: number, section: LessonSection): string {
  const tekst = section.titel + "\n" + section.inhoud.join("\n");
  let hash = 5381;
  for (let i = 0; i < tekst.length; i++) {
    hash = ((hash << 5) + hash + tekst.charCodeAt(i)) | 0;
  }
  return `${sectionIndex}-${hash}`;
}

function SectionCard({
  lessonId,
  partIndex,
  sectionIndex,
  section,
  onUpdate,
}: {
  lessonId: string;
  partIndex: number;
  sectionIndex: number;
  section: LessonSection;
  onUpdate: (inhoud: string[]) => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.inhoud.join("\n"));
  const [saving, setSaving] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const basisPad =
    "/api/lessons/" + lessonId + "/parts/" + partIndex + "/sections/" + sectionIndex;

  async function regenereer() {
    setRegenerating(true);
    setFout(null);
    try {
      const res = await fetch(basisPad + "/regenerate", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Regenereren mislukt.");
      }
      const data = await res.json();
      // Geen setDraft: de nieuwe inhoud gaat naar boven, de kaart krijgt
      // daardoor een nieuwe sleutel en leest zijn draft opnieuw uit de props.
      onUpdate(data.inhoud);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setRegenerating(false);
    }
  }

  async function opslaan() {
    const regels = draft
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);
    if (regels.length === 0) return;

    setSaving(true);
    setFout(null);
    try {
      const res = await fetch(basisPad, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inhoud: regels }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Opslaan mislukt.");
      }
      const data = await res.json();
      onUpdate(data.inhoud);
      setEditing(false);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-lijn bg-ivoor p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl text-marine">
          {section.titel}
          {section.duur ? (
            <span className="ml-2 text-base font-normal text-tekst-zacht">
              {section.duur} min
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={regenereer}
          disabled={regenerating}
          className="inline-flex min-h-14 shrink-0 items-center gap-2 text-base font-semibold text-marine underline underline-offset-4 disabled:opacity-70"
        >
          <RefreshIcon spinning={regenerating} />
          {regenerating ? "Bezig met maken..." : "Maak dit onderdeel opnieuw"}
        </button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <textarea
            rows={Math.max(3, draft.split("\n").length)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            aria-label={`Inhoud van ${section.titel}`}
            className="min-h-14 w-full rounded-lg border-2 border-lijn bg-ivoor-deep px-4 py-3 text-base text-tekst focus:border-marine"
          />
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={opslaan} disabled={saving}>
              {saving ? "Bezig met opslaan..." : "Bewaar dit onderdeel"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setDraft(section.inhoud.join("\n"));
              }}
            >
              Annuleren
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* max-w-[70ch]: langer dan ongeveer 70 tekens verliest het oog de
              volgende regel. text-base is 18px, de basismaat uit de brief. */}
          <ul className="mt-3 max-w-[70ch] space-y-2 text-base text-tekst">
            {section.inhoud.map((regel, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden>•</span>
                <span>{regel}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 inline-flex min-h-14 items-center text-base font-semibold text-marine underline underline-offset-4"
          >
            Pas dit onderdeel aan
          </button>
        </>
      )}

      {fout && (
        <p
          aria-live="polite"
          className="mt-3 rounded-lg border-2 border-fout-tekst bg-fout-vlak px-4 py-3 text-base font-medium text-fout-tekst"
        >
          {fout}
        </p>
      )}
    </div>
  );
}

export function LessonSections({
  lessonId,
  onderdelen: initieel,
}: {
  lessonId: string;
  onderdelen: LessonPart[];
}) {
  const [onderdelen, setOnderdelen] = useState(initieel);
  const [vorigeProps, setVorigeProps] = useState(initieel);

  /*
    Zet een versie terug, en de server stuurt via router.refresh() nieuwe
    onderdelen mee. Zonder deze afstemming zou dit component zijn eigen
    (oude) state blijven tonen en leek het terugzetten niet te werken. De
    lokale state is nooit meer dan een kopie van wat er op de server staat,
    dus hem gelijktrekken kan geen bewerking kwijtmaken.
  */
  if (initieel !== vorigeProps) {
    setVorigeProps(initieel);
    setOnderdelen(initieel);
  }

  function updateSectie(partIndex: number, sectionIndex: number, inhoud: string[]) {
    setOnderdelen((prev) =>
      prev.map((deel, pi) =>
        pi !== partIndex
          ? deel
          : {
              ...deel,
              secties: deel.secties.map((s, si) =>
                si !== sectionIndex ? s : { ...s, inhoud }
              ),
            }
      )
    );
  }

  return (
    <div className="mt-8 space-y-10">
      {onderdelen.map((deel, partIndex) => (
        <div key={deel.nummer}>
          <h2 className="font-display text-2xl text-marine">
            {deel.titel}
            <span className="ml-2 text-base font-normal text-tekst-zacht">
              {deel.duur} min
            </span>
          </h2>
          <div className="mt-4 space-y-4">
            {deel.secties.map((sectie, sectionIndex) => (
              <SectionCard
                key={sectieSleutel(sectionIndex, sectie)}
                lessonId={lessonId}
                partIndex={partIndex}
                sectionIndex={sectionIndex}
                section={sectie}
                onUpdate={(inhoud) => updateSectie(partIndex, sectionIndex, inhoud)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
