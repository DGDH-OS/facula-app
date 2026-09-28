"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedLesson } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { InlineUndo } from "@/components/ui/InlineUndo";

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
    <div className="mt-3 max-w-[70ch] space-y-5 rounded-lg border-2 border-lijn bg-ivoor-deep p-5">
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
  onTerugzetten,
  terugzettenBezig,
}: {
  lessonId: string;
  version: VersionSummary;
  onTerugzetten: () => void;
  terugzettenBezig: boolean;
}) {
  const [bekijken, setBekijken] = useState(false);
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [laden, setLaden] = useState(false);
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
          {/* Geen disabled-knop tijdens het terugzetten (brief 10.3): de
              knop blijft bereikbaar, een dubbele klik wordt in de ouder
              met een ref tegengehouden. */}
          <Button
            variant="secondary"
            onClick={onTerugzetten}
            aria-busy={terugzettenBezig}
          >
            {terugzettenBezig ? "Bezig met terugzetten..." : "Zet deze versie terug"}
          </Button>
        </div>
      </div>

      {/*
        Eerder stond aria-live om de hele preview. Een schermlezer las dan
        de volledige lesinhoud voor zodra die verscheen, en opnieuw bij elke
        wijziging. Nu meldt de live-regio alleen de status in één regel; de
        preview zelf is gewone inhoud die je met aria-expanded en de
        knoptekst kunt vinden.
      */}
      <p aria-live="polite" className="mt-3 text-base text-tekst-zacht empty:hidden">
        {laden ? "Bezig met ophalen..." : ""}
      </p>

      {bekijken && !laden && detail && <VersionPreview output={detail.output} />}

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bezigMetVersie, setBezigMetVersie] = useState<number | null>(null);
  const [undo, setUndo] = useState<{ melding: string; snapshot: number } | null>(
    null
  );
  const [status, setStatus] = useState<string | null>(null);
  const [lijstFout, setLijstFout] = useState<string | null>(null);
  const loopt = useRef(false);

  async function haalVersies(): Promise<VersionSummary[]> {
    const res = await fetch("/api/lessons/" + lessonId + "/versions");
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      throw new Error(d?.error ?? "Versiegeschiedenis ophalen mislukt.");
    }
    const data = await res.json();
    return data.versions as VersionSummary[];
  }

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
      setVersions(await haalVersies());
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setLaden(false);
    }
  }

  /*
    Terugzetten vraagt niets vooraf, maar biedt achteraf "Ongedaan maken"
    (brief 10.6), in plaats van de oude confirm-dialoog. Dat kan zonder één
    regel API-wijziging: de restore-route bewaart de staat van vóór het
    terugzetten zelf als nieuwe versie, en dat is altijd het hoogste
    versienummer in de lijst die we er direct na ophalen. Die versie
    terugzetten ís de undo.

    `router.refresh()` haalt de lespagina zelf opnieuw op, zodat de titel en
    de onderdelen de teruggezette versie tonen zonder volledige herlading —
    en zonder de undo-melding kwijt te raken, wat met een reload wel gebeurde.

    Het opnieuw ophalen van de lijst staat in een eigen try: als de restore
    zelf lukte maar de lijst niet binnenkomt, is het terugzetten wél gebeurd.
    Dan blijft het een succesmelding met een undo, en gaat er alleen een
    zachte regel bij dat het overzicht niet ververst kon worden. Een rode
    foutmelding zou hier suggereren dat de les nog is zoals hij was.
  */
  async function zetTerug(versionNumber: number, alsUndo = false) {
    if (loopt.current) return;
    loopt.current = true;

    setBezigMetVersie(versionNumber);
    setFout(null);
    setLijstFout(null);
    setStatus(null);
    setUndo(null);

    try {
      const res = await fetch(
        "/api/lessons/" + lessonId + "/versions/" + versionNumber + "/restore",
        { method: "POST" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Terugzetten mislukt.");
      }

      router.refresh();

      // De staat van vóór dit terugzetten is zelf als nieuwe versie
      // weggeschreven, en dat is altijd het hoogste versienummer. Lukt het
      // ophalen niet, dan is het hoogste bekende nummer plus één de beste
      // schatting; klopt die onverhoopt niet, dan meldt de undo-poging zelf
      // netjes dat die versie niet bestaat.
      let snapshot = 0;
      try {
        const lijst = await haalVersies();
        setVersions(lijst);
        snapshot = lijst.reduce(
          (hoogste, v) => Math.max(hoogste, v.versionNumber),
          0
        );
      } catch {
        setLijstFout(
          "Het overzicht van eerdere versies kon niet ververst worden. Herlaad de pagina om het bij te werken."
        );
        snapshot = (versions ?? []).reduce(
          (hoogste, v) => Math.max(hoogste, v.versionNumber),
          0
        );
        if (snapshot > 0) snapshot += 1;
      }

      if (alsUndo) {
        setStatus("De les staat weer zoals hij was.");
      } else if (snapshot > 0) {
        setUndo({
          melding: `De les is teruggezet naar versie ${versionNumber}.`,
          snapshot,
        });
      } else {
        setStatus(`De les is teruggezet naar versie ${versionNumber}.`);
      }
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      loopt.current = false;
      setBezigMetVersie(null);
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

      {/* Undo en foutmelding staan buiten het inklapbare deel: ze moeten
          ook zichtbaar blijven als de lijst daarna dichtgeklapt wordt. */}
      {undo && (
        <div className="mt-4">
          <InlineUndo
            melding={undo.melding}
            onUndo={() => zetTerug(undo.snapshot, true)}
          />
        </div>
      )}

      <p
        aria-live="polite"
        className="mt-4 max-w-[70ch] text-base text-tekst empty:hidden"
      >
        {status ?? ""}
      </p>

      {/* Zacht, niet rood: het terugzetten is gelukt, alleen dit overzicht
          liep achter. */}
      {lijstFout && (
        <p
          aria-live="polite"
          className="mt-4 max-w-[70ch] text-base text-tekst-zacht"
        >
          {lijstFout}
        </p>
      )}

      {fout && (
        <p
          role="alert"
          className="mt-4 max-w-[70ch] rounded-lg border-2 border-fout-tekst bg-fout-vlak px-4 py-3 text-base font-medium text-fout-tekst"
        >
          {fout}
        </p>
      )}

      {/* aria-live staat per statusregel, niet om de hele lijst: anders
          wordt elke versie voorgelezen zodra de lijst binnenkomt. */}
      {open && (
        <div className="mt-4">
          <p aria-live="polite" className="text-base text-tekst-zacht empty:hidden">
            {laden ? "Bezig met ophalen..." : ""}
          </p>
          {versions && versions.length === 0 && (
            <p className="max-w-[70ch] text-base text-tekst-zacht">
              Nog geen eerdere versies. Deze les is nog niet aangepast of opnieuw
              gemaakt.
            </p>
          )}
          {versions && versions.length > 0 && (
            <ul className="space-y-3">
              {versions.map((v) => (
                <VersionRow
                  key={v.versionNumber}
                  lessonId={lessonId}
                  version={v}
                  onTerugzetten={() => zetTerug(v.versionNumber)}
                  terugzettenBezig={bezigMetVersie === v.versionNumber}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

