"use client";

import { useState } from "react";
import type { GeneratedLesson } from "@/lib/types";

type LessonOutput = Omit<GeneratedLesson, "input">;

interface VersionSummary {
  versionNumber: number;
  createdAt: string;
}

interface VersionDetail extends VersionSummary {
  input: GeneratedLesson["input"];
  output: LessonOutput;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function VersionPreview({ output }: { output: LessonOutput }) {
  return (
    <div className="mt-3 space-y-4 rounded-lg border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-4">
      <div>
        <p className="font-display text-sm text-[var(--color-marine)]">{output.titel}</p>
        {output.kernbegrippen.length > 0 && (
          <p className="mt-1 text-xs text-[var(--color-inkt)]/60">
            {output.kernbegrippen.join(", ")}
          </p>
        )}
      </div>
      {output.onderdelen.map((deel) => (
        <div key={deel.nummer}>
          <p className="text-xs font-semibold text-[var(--color-inkt)]/70">{deel.titel}</p>
          <div className="mt-1 space-y-2">
            {deel.secties.map((sectie, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-[var(--color-inkt)]/60">
                  {sectie.titel}
                </p>
                <ul className="mt-0.5 space-y-0.5 text-xs text-[var(--color-inkt)]/80">
                  {sectie.inhoud.map((regel, j) => (
                    <li key={j}>• {regel}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function VersionRow({
  lessonId,
  version,
}: {
  lessonId: string;
  version: VersionSummary;
}) {
  const [bekijken, setBekijken] = useState(false);
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [laden, setLaden] = useState(false);
  const [herstellen, setHerstellen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const basisPad = "/api/lessons/" + lessonId + "/versions/" + version.versionNumber;

  async function toggleBekijken() {
    if (bekijken) {
      setBekijken(false);
      return;
    }
    setBekijken(true);
    if (detail) return;

    setLaden(true);
    setFout(null);
    try {
      const res = await fetch(basisPad);
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Versie ophalen mislukt.");
      }
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setLaden(false);
    }
  }

  async function terugzetten() {
    if (
      !window.confirm(
        `Les terugzetten naar versie ${version.versionNumber}? De huidige staat wordt zelf ook als versie bewaard.`
      )
    ) {
      return;
    }

    setHerstellen(true);
    setFout(null);
    try {
      const res = await fetch(basisPad + "/restore", { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Terugzetten mislukt.");
      }
      window.location.reload();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
      setHerstellen(false);
    }
  }

  return (
    <li className="rounded-xl border border-[var(--color-lijn)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--color-marine)]">
            Versie {version.versionNumber}
          </p>
          <p className="text-xs text-[var(--color-inkt)]/60">
            {formatTimestamp(version.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleBekijken}
            className="rounded-full border border-[var(--color-lijn)] px-3 py-1.5 text-xs font-medium text-[var(--color-inkt)]/70 transition hover:border-[var(--color-marine)]"
          >
            {bekijken ? "Verbergen" : "Bekijken"}
          </button>
          <button
            type="button"
            onClick={terugzetten}
            disabled={herstellen}
            className="rounded-full bg-[var(--color-marine)] px-3 py-1.5 text-xs font-medium text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:cursor-wait disabled:opacity-60"
          >
            {herstellen ? "Bezig…" : "Terugzetten"}
          </button>
        </div>
      </div>

      {bekijken && (laden ? (
        <p className="mt-3 text-xs text-[var(--color-inkt)]/60">Laden…</p>
      ) : (
        detail && <VersionPreview output={detail.output} />
      ))}

      {fout && <p className="mt-2 text-xs text-red-600">{fout}</p>}
    </li>
  );
}

export function VersionHistory({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (versions) return;

    setLaden(true);
    setFout(null);
    try {
      const res = await fetch("/api/lessons/" + lessonId + "/versions");
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Versiegeschiedenis ophalen mislukt.");
      }
      const data = await res.json();
      setVersions(data.versions);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setLaden(false);
    }
  }

  return (
    <div className="mt-10 border-t border-[var(--color-lijn)] pt-6">
      <button
        type="button"
        onClick={toggleOpen}
        className="font-display text-lg text-[var(--color-marine)]"
      >
        Versiegeschiedenis {open ? "▾" : "▸"}
      </button>

      {open && (
        <div className="mt-4">
          {laden && <p className="text-sm text-[var(--color-inkt)]/60">Laden…</p>}
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          {versions && versions.length === 0 && (
            <p className="text-sm text-[var(--color-inkt)]/60">
              Nog geen eerdere versies — deze les is nog niet bewerkt of geregenereerd.
            </p>
          )}
          {versions && versions.length > 0 && (
            <ul className="space-y-3">
              {versions.map((v) => (
                <VersionRow key={v.versionNumber} lessonId={lessonId} version={v} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

