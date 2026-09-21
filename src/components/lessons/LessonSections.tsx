"use client";

import { useState } from "react";
import type { LessonPart, LessonSection } from "@/lib/types";

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
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
      onUpdate(data.inhoud);
      setDraft(data.inhoud.join("\n"));
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
    <div className="rounded-xl border border-[var(--color-lijn)] bg-[var(--color-ivoor)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base text-[var(--color-marine)]">
          {section.titel}
          {section.duur ? (
            <span className="ml-2 text-xs font-normal text-[var(--color-inkt)]/50">
              {section.duur} min
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={regenereer}
          disabled={regenerating}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-goud)] transition hover:text-[var(--color-marine)] disabled:opacity-50"
        >
          <RefreshIcon spinning={regenerating} />
          {regenerating ? "Bezig…" : "Regenereer"}
        </button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            rows={Math.max(3, draft.split("\n").length)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--color-marine)]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={opslaan}
              disabled={saving}
              className="rounded-full bg-[var(--color-marine)] px-4 py-1.5 text-xs font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:opacity-60"
            >
              {saving ? "Opslaan…" : "Opslaan"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setDraft(section.inhoud.join("\n"));
              }}
              className="rounded-full border border-[var(--color-lijn)] px-4 py-1.5 text-xs font-medium text-[var(--color-inkt)]/70 transition hover:border-[var(--color-marine)]"
            >
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <ul
          onClick={() => setEditing(true)}
          title="Klik om te bewerken"
          className="mt-3 cursor-text space-y-1.5 text-sm text-[var(--color-inkt)]/80"
        >
          {section.inhoud.map((regel, i) => (
            <li key={i}>• {regel}</li>
          ))}
        </ul>
      )}

      {fout && <p className="mt-2 text-xs text-red-600">{fout}</p>}
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
          <h2 className="font-display text-xl text-[var(--color-marine)]">
            {deel.titel}
            <span className="ml-2 text-sm font-normal text-[var(--color-inkt)]/50">
              {deel.duur} min
            </span>
          </h2>
          <div className="mt-4 space-y-4">
            {deel.secties.map((sectie, sectionIndex) => (
              <SectionCard
                key={sectionIndex}
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
