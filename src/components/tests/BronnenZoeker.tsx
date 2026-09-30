"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import type { BronResultaat } from "@/lib/bronnen";

interface Voorbeeld {
  tekst: string;
  vermelding: string;
}

/**
 * Bronnen bij de begrippen: Facula doet suggesties, de docent bekijkt wat er in
 * de bron staat, klikt de gewenste bron aan en krijgt de APA-vermelding erbij.
 * Facula schrijft of kiest niets zonder de docent: alleen echte artikelen en
 * encyclopedieteksten, woordelijk overgenomen.
 */
export function BronnenZoeker({
  onKies,
  begrippen = [],
  automatisch = false,
  bronIngevuld = false,
  vak,
}: {
  onKies: (tekst: string, vermelding: string) => void;
  /** Kernbegrippen uit de wizard; daarmee zoekt Facula zelf suggesties. */
  begrippen?: string[];
  /** Zoek zelf suggesties (na 1,5 s rust) zodra er begrippen zijn. */
  automatisch?: boolean;
  /** True als er al een bron gekozen is: dan zoekt Facula niet opnieuw. */
  bronIngevuld?: boolean;
  vak?: string;
}) {
  const [zoek, setZoek] = useState("");
  const [bezig, setBezig] = useState<string | null>(null);
  const [lijst, setLijst] = useState<BronResultaat[] | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [voorbeelden, setVoorbeelden] = useState<Record<string, Voorbeeld>>({});
  const [gekozen, setGekozen] = useState<string | null>(null);

  const begrippenSleutel = begrippen.slice(0, 4).join("|");
  const laatsteSleutel = useRef("");

  async function zoekMet(url: string, leegMelding: string) {
    setBezig("zoeken");
    setMelding(null);
    setLijst(null);
    setOpen(null);
    try {
      const r = await fetch(url);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Zoeken lukt niet.");
      setLijst(data.bronnen);
      if (data.bronnen.length === 0) setMelding(leegMelding);
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Zoeken lukt niet.");
    } finally {
      setBezig(null);
    }
  }

  function zoekOpBegrippen() {
    return zoekMet(
      `/api/bronnen/zoek?vak=${encodeURIComponent(vak ?? "")}&begrippen=${encodeURIComponent(begrippenSleutel)}`,
      `Geen bron gevonden die je begrippen echt behandelt${vak ? ` (vak: ${vak})` : ""}. Zoek hieronder op een onderwerp, of plak zelf een bron uit je lesboek.`
    );
  }

  function zoekOpOnderwerp() {
    return zoekMet(
      `/api/bronnen/zoek?q=${encodeURIComponent(zoek)}`,
      "Niets gevonden. Probeer een andere zoekterm."
    );
  }

  useEffect(() => {
    if (!automatisch || bronIngevuld || !begrippenSleutel) return;
    const sleutel = `${vak ?? ""}::${begrippenSleutel}`;
    if (laatsteSleutel.current === sleutel) return;
    const timer = setTimeout(() => {
      laatsteSleutel.current = sleutel;
      void zoekOpBegrippen();
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automatisch, bronIngevuld, begrippenSleutel, vak]);

  /** Haalt de tekst en APA-vermelding op (eenmalig per bron) zonder iets te kiezen. */
  async function haalVoorbeeld(b: BronResultaat): Promise<Voorbeeld | null> {
    if (voorbeelden[b.url]) return voorbeelden[b.url];
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
      const v = { tekst: data.tekst as string, vermelding: data.vermelding as string };
      setVoorbeelden((huidig) => ({ ...huidig, [b.url]: v }));
      return v;
    } catch (e) {
      setMelding(e instanceof Error ? e.message : "Ophalen lukt niet.");
      return null;
    } finally {
      setBezig(null);
    }
  }

  async function bekijk(b: BronResultaat) {
    if (open === b.url) {
      setOpen(null);
      return;
    }
    const v = await haalVoorbeeld(b);
    if (v) setOpen(b.url);
  }

  async function kies(b: BronResultaat) {
    const v = await haalVoorbeeld(b);
    if (!v) return;
    onKies(v.tekst, v.vermelding);
    setGekozen(b.url);
    setMelding(`Bron gekozen: ${b.titel}. De APA-bronvermelding is ingevuld. Lees de tekst na.`);
  }

  return (
    <div className="rounded-2xl border-2 border-lijn bg-ivoor-deep p-6">
      {begrippen.length > 0 && (
        <div className="mb-5">
          <p className="text-base text-tekst">
            Facula zoekt bronnen bij je begrippen: {begrippen.slice(0, 4).join(", ")}. Bekijk
            de tekst en klik de bron aan die je wilt gebruiken.
          </p>
          <div className="mt-3">
            <Button variant="primary" onClick={() => void zoekOpBegrippen()} disabled={bezig !== null}>
              {bezig === "zoeken" ? "Bezig met zoeken..." : "Zoek bronnen bij mijn begrippen"}
            </Button>
          </div>
        </div>
      )}

      <Field
        label="Zelf een bron zoeken"
        hulptekst="Zoek op een onderwerp, bijvoorbeeld energiearmoede of fotosynthese."
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
                if (zoek.trim().length >= 3 && !bezig) void zoekOpOnderwerp();
              }
            }}
            className={VELD_KLASSEN}
          />
        )}
      </Field>
      <div className="mt-3">
        <Button
          variant="secondary"
          onClick={() => void zoekOpOnderwerp()}
          disabled={zoek.trim().length < 3 || bezig !== null}
        >
          Zoek bronnen
        </Button>
      </div>

      <div role="status" aria-live="polite" className="mt-3 text-base text-tekst-zacht">
        {bezig === "zoeken" ? "Bezig met zoeken..." : melding}
      </div>

      {lijst && lijst.length > 0 && (
        <ul className="mt-4 space-y-3">
          {lijst.map((b) => {
            const v = voorbeelden[b.url];
            const isOpen = open === b.url;
            const isGekozen = gekozen === b.url;
            return (
              <li
                key={b.url}
                className={`rounded-xl border-2 bg-ivoor p-4 ${isGekozen ? "border-marine" : "border-lijn"}`}
              >
                <p className="text-base font-medium text-tekst">{b.titel}</p>
                {b.past && b.past.length > 0 && (
                  <p className="mt-1 text-base font-medium text-succes-tekst">
                    Bevat: {b.past.join(", ")}
                  </p>
                )}
                <p className="mt-1 text-base text-tekst-zacht">
                  {b.site}
                  {b.domein !== "nl.wikipedia.org" &&
                    b.datum &&
                    `, ${new Date(b.datum).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <Button
                    variant="secondary"
                    onClick={() => void bekijk(b)}
                    disabled={bezig !== null}
                    aria-expanded={isOpen}
                  >
                    {bezig === b.url ? "Bezig..." : isOpen ? "Verberg tekst" : "Bekijk wat erin staat"}
                  </Button>
                  <Button variant="primary" onClick={() => void kies(b)} disabled={bezig !== null}>
                    {isGekozen ? "Gekozen" : "Gebruik deze bron"}
                  </Button>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-medium text-marine underline underline-offset-4"
                  >
                    Open origineel (nieuw tabblad)
                  </a>
                </div>

                {isOpen && v && (
                  <div className="mt-4 rounded-xl border-2 border-lijn bg-ivoor-deep p-4">
                    <p className="max-h-72 overflow-y-auto whitespace-pre-line text-base leading-relaxed text-tekst">
                      {v.tekst}
                    </p>
                    <p className="mt-3 text-base text-tekst-zacht">
                      <span className="font-medium text-tekst">APA: </span>
                      {v.vermelding}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
