"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import type { BronResultaat } from "@/lib/bronnen";

/**
 * Zoekt echte nieuwsartikelen bij een onderwerp en biedt ze aan. De docent kiest;
 * de tekst wordt woordelijk overgenomen met bronvermelding en link. Niets wordt
 * door Facula geschreven of samengevat.
 */
export function BronnenZoeker({
  onKies,
  begrippen = [],
  automatisch = false,
}: {
  onKies: (tekst: string, vermelding: string) => void;
  /** Kernbegrippen uit de wizard; daarmee kan Facula zelf bronnen zoeken. */
  begrippen?: string[];
  /** Zoek meteen zodra er begrippen zijn (bijv. na kiezen van een periode). */
  automatisch?: boolean;
}) {
  const [zoek, setZoek] = useState("");
  const [bezig, setBezig] = useState<string | null>(null);
  const [lijst, setLijst] = useState<BronResultaat[] | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  const begrippenSleutel = begrippen.slice(0, 4).join("|");
  const autoGedaan = useRef(false);

  async function zoekOpBegrippen() {
    setBezig("zoeken");
    setMelding(null);
    setLijst(null);
    try {
      const r = await fetch(`/api/bronnen/zoek?begrippen=${encodeURIComponent(begrippenSleutel)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Zoeken lukt niet.");
      setLijst(data.bronnen);
      if (data.bronnen.length === 0)
        setMelding(
          "Geen artikel gevonden dat je begrippen echt behandelt. Abstracte begrippen staan zelden in het nieuws van vandaag. Zoek hieronder op een actueel onderwerp, bijvoorbeeld energiearmoede of asielopvang."
        );
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Zoeken lukt niet.");
    } finally {
      setBezig(null);
    }
  }

  useEffect(() => {
    if (!automatisch || autoGedaan.current || !begrippenSleutel) return;
    autoGedaan.current = true;
    void zoekOpBegrippen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automatisch, begrippenSleutel]);

  async function zoekBronnen() {
    setBezig("zoeken");
    setMelding(null);
    setLijst(null);
    try {
      const r = await fetch(`/api/bronnen/zoek?q=${encodeURIComponent(zoek)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Zoeken lukt niet.");
      setLijst(data.bronnen);
      if (data.bronnen.length === 0) setMelding("Niets gevonden. Probeer een andere zoekterm.");
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Zoeken lukt niet.");
    } finally {
      setBezig(null);
    }
  }

  async function kies(b: BronResultaat) {
    setBezig(b.url);
    setMelding(null);
    try {
      const r = await fetch("/api/bronnen/tekst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: b.url, datum: b.datum }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Ophalen lukt niet.");
      onKies(data.tekst, data.vermelding);
      setMelding(`Bron overgenomen: ${b.titel}. Lees hem na en pas zo nodig aan.`);
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Ophalen lukt niet.");
    } finally {
      setBezig(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
      {begrippen.length > 0 && (
        <div className="mb-5">
          <p className="text-base text-tekst">
            Facula kan zelf bronnen zoeken bij je begrippen: {begrippen.slice(0, 4).join(", ")}.
          </p>
          <div className="mt-3">
            <Button
              variant="primary"
              onClick={() => void zoekOpBegrippen()}
              disabled={bezig !== null}
            >
              {bezig === "zoeken" ? "Bezig met zoeken..." : "Zoek automatisch bij mijn begrippen"}
            </Button>
          </div>
        </div>
      )}
      <Field
        label="Bron zoeken"
        hulptekst="Zoek een echt nieuwsartikel over een maatschappelijk probleem, bijvoorbeeld energiearmoede."
      >
        {(ids) => (
          <input
            {...ids}
            type="search"
            maxLength={120}
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (zoek.trim().length >= 3 && !bezig) void zoekBronnen();
              }
            }}
            className={VELD_KLASSEN}
          />
        )}
      </Field>
      <div className="mt-3">
        <Button
          variant="secondary"
          onClick={() => void zoekBronnen()}
          disabled={zoek.trim().length < 3 || bezig !== null}
        >
          {bezig === "zoeken" ? "Bezig met zoeken..." : "Zoek bronnen"}
        </Button>
      </div>

      <div role="status" aria-live="polite" className="mt-3 text-base text-tekst-zacht">
        {melding}
      </div>

      {lijst && lijst.length > 0 && (
        <ul className="mt-4 space-y-3">
          {lijst.map((b) => (
            <li key={b.url} className="rounded-xl border-2 border-lijn bg-ivoor p-4">
              <p className="text-base font-medium text-tekst">{b.titel}</p>
              {b.past && b.past.length > 0 && (
                <p className="mt-1 text-base font-medium text-succes-tekst">
                  Bevat: {b.past.join(", ")}
                </p>
              )}
              <p className="mt-1 text-base text-tekst-zacht">
                {b.site}
                {b.datum &&
                  `, ${new Date(b.datum).toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  onClick={() => void kies(b)}
                  disabled={bezig !== null}
                >
                  {bezig === b.url ? "Bezig..." : "Gebruik deze bron"}
                </Button>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-medium text-marine underline underline-offset-4"
                >
                  Lees het artikel (opent nieuw tabblad)
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
