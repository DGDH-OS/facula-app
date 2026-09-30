"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import type { Niveau, Vak } from "@/lib/types";

const VAKKEN: Vak[] = ["Maatschappijleer", "Geschiedenis", "Economie", "Aardrijkskunde"];
const NIVEAUS: Niveau[] = ["vmbo-t", "havo", "vwo"];

interface PeriodeRij {
  id?: string;
  periode: number;
  leerdoelen: string;
  begrippen: string;
}

function huidigSchooljaar(): string {
  const nu = new Date();
  const start = nu.getMonth() >= 7 ? nu.getFullYear() : nu.getFullYear() - 1;
  return `${start}-${start + 1}`;
}

const LEEG = (p: number): PeriodeRij => ({ periode: p, leerdoelen: "", begrippen: "" });

/**
 * Per periode één keer de leerdoelen en de begrippen met definities uit het
 * lesboek vastleggen. De toets aan het einde van de periode komt daaruit.
 */
export default function PeriodesPage() {
  const [schooljaar, setSchooljaar] = useState(huidigSchooljaar());
  const [vak, setVak] = useState<Vak>("Maatschappijleer");
  const [niveau, setNiveau] = useState<Niveau>("havo");
  const [leerjaar, setLeerjaar] = useState(4);
  const [rijen, setRijen] = useState<PeriodeRij[]>([1, 2, 3, 4].map(LEEG));
  const [status, setStatus] = useState<Record<number, string>>({});
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    let afgebroken = false;
    createClient()
      .schema("facula")
      .from("periodes")
      .select("id, periode, leerdoelen, begrippen")
      .eq("schooljaar", schooljaar)
      .eq("vak", vak)
      .eq("niveau", niveau)
      .eq("leerjaar", leerjaar)
      .then(({ data, error }) => {
        if (afgebroken) return;
        if (error) {
          setFout("Periodes laden lukt nog niet. Probeer het later opnieuw.");
          return;
        }
        setFout(null);
        setRijen(
          [1, 2, 3, 4].map((p) => {
            const gevonden = data?.find((r) => r.periode === p);
            return gevonden ? { ...gevonden } : LEEG(p);
          })
        );
      });
    return () => {
      afgebroken = true;
    };
  }, [schooljaar, vak, niveau, leerjaar]);

  function wijzig(p: number, veld: "leerdoelen" | "begrippen", waarde: string) {
    setRijen(rijen.map((r) => (r.periode === p ? { ...r, [veld]: waarde } : r)));
    setStatus({ ...status, [p]: "" });
  }

  async function bewaar(rij: PeriodeRij) {
    setStatus({ ...status, [rij.periode]: "Bezig met opslaan..." });
    const client = createClient();
    const { data: sessie } = await client.auth.getUser();
    if (!sessie.user) {
      setStatus({ ...status, [rij.periode]: "Je bent uitgelogd." });
      return;
    }
    const { data, error } = await client
      .schema("facula")
      .from("periodes")
      .upsert(
        {
          user_id: sessie.user.id,
          schooljaar,
          periode: rij.periode,
          vak,
          niveau,
          leerjaar,
          leerdoelen: rij.leerdoelen.trim(),
          begrippen: rij.begrippen.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,schooljaar,periode,vak,niveau,leerjaar" }
      )
      .select("id")
      .single();
    if (error || !data) {
      setStatus({ ...status, [rij.periode]: "Opslaan mislukt. Probeer het opnieuw." });
      return;
    }
    setRijen((huidig) => huidig.map((r) => (r.periode === rij.periode ? { ...r, id: data.id } : r)));
    setStatus((s) => ({ ...s, [rij.periode]: "Opgeslagen." }));
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl text-marine">Periodes</h1>
      <p className="mt-2 text-base text-tekst-zacht">
        Leg per periode één keer de leerdoelen en de begrippen uit je lesboek vast. De toets aan het
        einde van de periode maak je daarna met één klik.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Schooljaar">
          {(ids) => (
            <input
              {...ids}
              value={schooljaar}
              maxLength={9}
              onChange={(e) => setSchooljaar(e.target.value)}
              className={VELD_KLASSEN}
            />
          )}
        </Field>
        <Field label="Vak">
          {(ids) => (
            <select {...ids} value={vak} onChange={(e) => setVak(e.target.value as Vak)} className={VELD_KLASSEN}>
              {VAKKEN.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Niveau">
          {(ids) => (
            <select
              {...ids}
              value={niveau}
              onChange={(e) => setNiveau(e.target.value as Niveau)}
              className={VELD_KLASSEN}
            >
              {NIVEAUS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Leerjaar">
          {(ids) => (
            <input
              {...ids}
              type="number"
              min={1}
              max={6}
              value={leerjaar}
              onChange={(e) => setLeerjaar(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
              className={VELD_KLASSEN}
            />
          )}
        </Field>
      </div>

      {fout && (
        <p role="alert" className="mt-4 text-base font-medium text-fout-tekst">
          {fout}
        </p>
      )}

      <div className="mt-8 space-y-8">
        {rijen.map((rij) => (
          <section key={rij.periode} className="rounded-2xl border-2 border-lijn bg-ivoor p-6">
            <h2 className="font-display text-2xl text-marine">Periode {rij.periode}</h2>
            <div className="mt-4 space-y-4">
              <Field label="Leerdoelen" hulptekst="Eén leerdoel per regel, zoals in je studiewijzer.">
                {(ids) => (
                  <textarea
                    {...ids}
                    rows={5}
                    maxLength={4000}
                    value={rij.leerdoelen}
                    onChange={(e) => wijzig(rij.periode, "leerdoelen", e.target.value)}
                    className={`${VELD_KLASSEN} leading-relaxed`}
                  />
                )}
              </Field>
              <Field
                label="Begrippen en definities uit je lesboek"
                hulptekst="Eén per regel: begrip: definitie. Wordt letterlijk overgenomen."
              >
                {(ids) => (
                  <textarea
                    {...ids}
                    rows={6}
                    maxLength={6000}
                    value={rij.begrippen}
                    onChange={(e) => wijzig(rij.periode, "begrippen", e.target.value)}
                    className={`${VELD_KLASSEN} leading-relaxed`}
                  />
                )}
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button variant="primary" onClick={() => bewaar(rij)}>
                Bewaar periode {rij.periode}
              </Button>
              {rij.id && (
                <>
                  <Link
                    href={`/app/tests/new?periode=${rij.id}`}
                    className="text-base font-medium text-marine underline underline-offset-4"
                  >
                    Maak de toets van deze periode
                  </Link>
                  <Link
                    href={`/app/lessons/new?periode=${rij.id}`}
                    className="text-base font-medium text-marine underline underline-offset-4"
                  >
                    Maak een les
                  </Link>
                </>
              )}
              <span role="status" aria-live="polite" className="text-base text-tekst-zacht">
                {status[rij.periode]}
              </span>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
