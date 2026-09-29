"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/PageHeader";
import { ErrorNotice } from "@/components/ui/Notice";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ROL_LABEL, ROL_UITLEG, type SchoolRol } from "@/lib/school";

/**
 * De docenten van de school: rol wijzigen, sectie toewijzen, weghalen, en
 * nieuwe collega's uitnodigen.
 *
 * Rol en sectie gaan rechtstreeks via de browser-client naar
 * facula.school_members. De policy school_members_update_beheerder staat alleen
 * de eigen school toe en alleen een beheerder, en het kolomrecht laat alleen
 * rol, sectie en status wijzigen. Een tussenlaag zou die regels nabouwen.
 *
 * Uitnodigen loopt wél via een route: het token moet uit een veilige bron komen
 * en mag daarna nooit meer op te vragen zijn (zie POST /api/school/invites).
 *
 * Twee dingen kan een beheerder bewust NIET doen met zichzelf: zijn eigen rol
 * verlagen en zichzelf weghalen. Dat is geen vertrouwenskwestie maar een slot
 * op de deur: de laatste beheerder die zich verlaagt, laat een school achter
 * die niemand meer kan beheren, en dat is alleen met de hand door ons te
 * herstellen.
 */

export interface LidRij {
  userId: string;
  email: string;
  rol: SchoolRol;
  status: string;
  sectieId: string | null;
  sectieNaam: string | null;
  lessen: number;
  toetsen: number;
  rapporten: number;
}

export interface UitnodigingRij {
  id: string;
  email: string;
  rol: SchoolRol;
  verlooptOp: string;
}

const ROLLEN: SchoolRol[] = ["docent", "sectievoorzitter", "beheerder"];

export function DocentenBeheer({
  mijnUserId,
  leden,
  secties,
  uitnodigingen,
  plekkenVrij,
}: {
  mijnUserId: string;
  leden: LidRij[];
  secties: { id: string; naam: string }[];
  uitnodigingen: UitnodigingRij[];
  plekkenVrij: number;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [nieuweRol, setNieuweRol] = useState<SchoolRol>("docent");
  const [nieuweSectie, setNieuweSectie] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [gekopieerd, setGekopieerd] = useState(false);

  async function wijzigLid(userId: string, velden: Record<string, unknown>) {
    setBezig(true);
    setFout(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .schema("facula")
        .from("school_members")
        .update(velden)
        .eq("user_id", userId);
      if (error) throw new Error("Wijzigen lukte niet.");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Wijzigen lukte niet.");
    } finally {
      setBezig(false);
    }
  }

  async function haalWeg(lid: LidRij) {
    const bevestiging = window.confirm(
      lid.email +
        " weghalen bij deze school? De eigen lessen, toetsen en teksten van deze docent blijven van hem of haar, en het account blijft bestaan. De docentplek komt vrij."
    );
    if (!bevestiging) return;

    setBezig(true);
    setFout(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .schema("facula")
        .from("school_members")
        .delete()
        .eq("user_id", lid.userId);
      if (error) throw new Error("Weghalen lukte niet.");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Weghalen lukte niet.");
    } finally {
      setBezig(false);
    }
  }

  async function nodigUit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    setLink(null);
    setGekopieerd(false);
    try {
      const response = await fetch("/api/school/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          rol: nieuweRol,
          sectieId: nieuweSectie || null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Uitnodigen lukte niet.");
      setLink(data.link as string);
      setEmail("");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Uitnodigen lukte niet.");
    } finally {
      setBezig(false);
    }
  }

  async function trekIn(uitnodiging: UitnodigingRij) {
    setBezig(true);
    setFout(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .schema("facula")
        .from("school_invites")
        .delete()
        .eq("id", uitnodiging.id);
      if (error) throw new Error("Intrekken lukte niet.");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Intrekken lukte niet.");
    } finally {
      setBezig(false);
    }
  }

  async function kopieer(tekst: string) {
    try {
      await navigator.clipboard.writeText(tekst);
      setGekopieerd(true);
    } catch {
      setFout("Kopiëren lukte niet. Selecteer de link en kopieer hem zelf.");
    }
  }

  return (
    <div className="space-y-8">
      {leden.length === 0 ? (
        <EmptyState tekst="Er zijn nog geen docenten. Nodig hieronder je eerste collega uit." />
      ) : (
        <ul className="divide-y-2 divide-lijn overflow-hidden rounded-2xl border-2 border-lijn">
          {leden.map((lid) => {
            const zelf = lid.userId === mijnUserId;
            return (
              <li key={lid.userId} className="bg-ivoor px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-lg font-semibold text-marine">
                      {lid.email}
                      {zelf && (
                        <span className="ml-2 text-base font-normal text-tekst-zacht">
                          (jij)
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-base text-tekst-zacht">
                      {lid.lessen} lessen · {lid.toetsen} toetsen · {lid.rapporten}{" "}
                      teksten deze maand
                    </span>
                  </div>
                  {lid.status !== "active" && (
                    <StatusBadge
                      label="Niet actief"
                      tone="warning"
                      uitleg="Deze docent gebruikt geen docentplek"
                    />
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Rol" hulptekst={ROL_UITLEG[lid.rol]}>
                    {(ids) => (
                      <select
                        {...ids}
                        value={lid.rol}
                        disabled={bezig || zelf}
                        onChange={(e) => wijzigLid(lid.userId, { role: e.target.value })}
                        className={VELD_KLASSEN}
                      >
                        {ROLLEN.map((rol) => (
                          <option key={rol} value={rol}>
                            {ROL_LABEL[rol]}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>

                  <Field label="Sectie">
                    {(ids) => (
                      <select
                        {...ids}
                        value={lid.sectieId ?? ""}
                        disabled={bezig}
                        onChange={(e) =>
                          wijzigLid(lid.userId, { section_id: e.target.value || null })
                        }
                        className={VELD_KLASSEN}
                      >
                        <option value="">Geen sectie</option>
                        {secties.map((sectie) => (
                          <option key={sectie.id} value={sectie.id}>
                            {sectie.naam}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>

                {zelf ? (
                  <p className="mt-3 text-base text-tekst-zacht">
                    Je kunt je eigen rol niet verlagen en jezelf niet weghalen. Zo
                    blijft er altijd iemand die deze school kan beheren.
                  </p>
                ) : (
                  <div className="mt-3">
                    <Button variant="ghost" onClick={() => haalWeg(lid)} disabled={bezig}>
                      Weghalen bij deze school
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {uitnodigingen.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-marine">
            Uitnodigingen die nog open staan
          </h3>
          <ul className="mt-3 divide-y-2 divide-lijn overflow-hidden rounded-2xl border-2 border-lijn">
            {uitnodigingen.map((uitnodiging) => (
              <li
                key={uitnodiging.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-ivoor px-5 py-4"
              >
                <div className="min-w-0">
                  <span className="block text-base font-semibold text-marine">
                    {uitnodiging.email}
                  </span>
                  <span className="mt-1 block text-base text-tekst-zacht">
                    {ROL_LABEL[uitnodiging.rol]} · geldig tot{" "}
                    {new Date(uitnodiging.verlooptOp).toLocaleDateString("nl-NL")}
                  </span>
                </div>
                <Button variant="ghost" onClick={() => trekIn(uitnodiging)} disabled={bezig}>
                  Intrekken
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-[70ch] text-base text-tekst-zacht">
            De link staat hier niet meer: die is één keer te zien, vlak nadat je
            iemand uitnodigt. Kwijt? Nodig dezelfde collega opnieuw uit, dan
            vervalt de oude link en krijg je een nieuwe.
          </p>
        </div>
      )}

      {fout && <ErrorNotice melding={fout} />}

      {link && (
        <div className="space-y-3 rounded-xl border-2 border-succes-tekst bg-succes-vlak px-5 py-4">
          <p className="text-base font-semibold text-succes-tekst">
            De uitnodiging staat klaar. Stuur deze link naar je collega.
          </p>
          <p className="break-all rounded-lg bg-ivoor px-4 py-3 text-base text-tekst">
            {link}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => kopieer(link)}>
              {gekopieerd ? "Gekopieerd ✓" : "Link kopiëren"}
            </Button>
          </div>
          <p className="text-base text-succes-tekst">
            Wij sturen geen mail. Je ziet deze link één keer, dus kopieer hem nu.
          </p>
        </div>
      )}

      <form
        onSubmit={nodigUit}
        className="space-y-5 rounded-2xl border-2 border-lijn bg-ivoor p-6"
      >
        <h3 className="font-display text-xl text-marine">Een collega uitnodigen</h3>
        <p className="max-w-[70ch] text-base text-tekst-zacht">
          Je krijgt een link die je zelf doorstuurt. Er gaat geen mail uit vanuit
          Facula. Nog {plekkenVrij}{" "}
          {plekkenVrij === 1 ? "docentplek" : "docentplekken"} vrij.
        </p>

        <Field label="E-mailadres van je collega" verplicht>
          {(ids) => (
            <input
              {...ids}
              type="email"
              autoComplete="off"
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={VELD_KLASSEN}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rol" hulptekst={ROL_UITLEG[nieuweRol]}>
            {(ids) => (
              <select
                {...ids}
                value={nieuweRol}
                onChange={(e) => setNieuweRol(e.target.value as SchoolRol)}
                className={VELD_KLASSEN}
              >
                {ROLLEN.map((rol) => (
                  <option key={rol} value={rol}>
                    {ROL_LABEL[rol]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Sectie" hulptekst="Mag je leeg laten, je kunt het later zetten.">
            {(ids) => (
              <select
                {...ids}
                value={nieuweSectie}
                onChange={(e) => setNieuweSectie(e.target.value)}
                className={VELD_KLASSEN}
              >
                <option value="">Geen sectie</option>
                {secties.map((sectie) => (
                  <option key={sectie.id} value={sectie.id}>
                    {sectie.naam}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <Button type="submit" variant="primary" disabled={bezig || plekkenVrij <= 0}>
          {bezig ? "Bezig..." : "Uitnodiging maken"}
        </Button>

        {plekkenVrij <= 0 && (
          <p className="text-base font-semibold text-waarschuwing-tekst">
            Alle docentplekken zijn in gebruik. Neem contact met ons op om er meer
            bij te laten zetten, of haal eerst een docent weg.
          </p>
        )}
      </form>
    </div>
  );
}
