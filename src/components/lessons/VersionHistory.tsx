"use client";

import { useState } from "react";
import type { GeneratedLesson } from "@/lib/types";
import { Button } from "@/components/ui/Button";

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
    <div className="mt-3 space-y-5 rounded-lg border-2 border-lijn bg-ivoor-deep p-5">
      <div>
        <p className="font-display text-xl text-marine">{output.titel}</p>
        {output.kernbegrippen.length > 0 && (
          <p className="mt-1 text-base text-tekst-zacht">
            {output.kernbegrippen.join(", ")}
          </p>
        )}
      </div>
      {output.onderdelen.map((deel) => (
        <div key={deel.nummer}>
          <p className="text-base font-semibold text-marine">{deel.titel}</p>
          <div className="mt-2 space-y-3">
            {deel.secties.map((sectie, i) => (
              <div key={i}>
                <p className="text-base font-medium text-tekst-zacht">
                  {sectie.titel}
                </p>
                <ul className="mt-1 space-y-1 text-base text-tekst">
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
    <li className="rounded-xl border-2 border-lijn p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-marine">
            Versie {version.versionNumber}
          </p>
          <p className="text-base text-tekst-zacht">
            {formatTimestamp(version.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={toggleBekijken}
            aria-expanded={bekijken}
          >
            {bekijken ? "Verberg deze versie" : "Bekijk deze versie"}
          </Button>
          <Button variant="secondary" onClick={terugzetten} disabled={herstellen}>
            {herstellen ? "Bezig met terugzetten..." : "Zet deze versie terug"}
          </Button>
        </div>
      </div>

      <div aria-live="polite">
        {bekijken &&
          (laden ? (
            <p className="mt-3 text-base text-tekst-zacht">Bezig met ophalen...</p>
          ) : (
            detail && <VersionPreview output={detail.output} />
          ))}
      </div>

      {fout && (
        <p
          aria-live="polite"
          className="mt-3 rounded-lg border-2 border-fout-tekst bg-fout-vlak px-4 py-3 text-base font-medium text-fout-tekst"
        >
          {fout}
        </p>
      )}
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
    <div className="mt-10 border-t-2 border-lijn pt-6">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="inline-flex min-h-14 items-center gap-2 font-display text-xl text-marine underline underline-offset-4"
      >
        Eerdere versies
        <span aria-hidden>{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="mt-4" aria-live="polite">
          {laden && <p className="text-base text-tekst-zacht">Bezig met ophalen...</p>}
          {fout && (
            <p className="rounded-lg border-2 border-fout-tekst bg-fout-vlak px-4 py-3 text-base font-medium text-fout-tekst">
              {fout}
            </p>
          )}
          {versions && versions.length === 0 && (
            <p className="text-base text-tekst-zacht">
              Nog geen eerdere versies. Deze les is nog niet aangepast of opnieuw
              gemaakt.
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

