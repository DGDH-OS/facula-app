"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/PageHeader";
import { ErrorNotice } from "@/components/ui/Notice";

/**
 * Secties toevoegen, hernoemen en weghalen.
 *
 * De schrijfacties gaan rechtstreeks via de browser-client naar
 * facula.sections. Dat kan hier veilig, en dat is de reden dat er geen route
 * tussen zit: de policies sections_insert/update/delete_beheerder laten alleen
 * de eigen school toe en alleen een beheerder. Een tussenlaag zou die regels
 * nabouwen zonder er iets aan toe te voegen.
 *
 * Na elke wijziging `router.refresh()`: de pagina is een server component en
 * haalt de lijst dan opnieuw op. Zo staat er nooit iets op het scherm dat de
 * database niet bevestigd heeft.
 *
 * Een sectie weghalen vraagt een bevestiging. Het is geen onherstelbaar
 * verlies (de lessen van docenten blijven van hen), maar het gedeelde
 * materiaal in die sectie gaat wel mee, en dat is niet terug te halen.
 */

export interface SectieRij {
  id: string;
  naam: string;
  aantalDocenten: number;
  aantalGedeeld: number;
}

export function SectiesBeheer({ secties }: { secties: SectieRij[] }) {
  const router = useRouter();
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [wijzigId, setWijzigId] = useState<string | null>(null);
  const [wijzigNaam, setWijzigNaam] = useState("");

  async function voegToe(e: React.FormEvent) {
    e.preventDefault();
    const naam = nieuweNaam.trim();
    if (!naam) {
      setFout("Vul een naam in, bijvoorbeeld het vak of het team.");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      const supabase = createClient();
      const { data: schoolId } = await supabase.schema("facula").rpc("mijn_school_id");
      if (!schoolId) throw new Error("Je hoort niet bij een school.");

      const { error } = await supabase
        .schema("facula")
        .from("sections")
        .insert({ school_id: schoolId, naam });
      if (error) {
        throw new Error(
          error.code === "23505"
            ? "Er is al een sectie met deze naam."
            : "Toevoegen lukte niet. Ben je beheerder van deze school?"
        );
      }
      setNieuweNaam("");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Toevoegen lukte niet.");
    } finally {
      setBezig(false);
    }
  }

  async function hernoem(id: string) {
    const naam = wijzigNaam.trim();
    if (!naam) {
      setFout("Vul een naam in.");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .schema("facula")
        .from("sections")
        .update({ naam })
        .eq("id", id);
      if (error) throw new Error("Hernoemen lukte niet.");
      setWijzigId(null);
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Hernoemen lukte niet.");
    } finally {
      setBezig(false);
    }
  }

  async function verwijder(sectie: SectieRij) {
    const bevestiging = window.confirm(
      "Sectie " +
        sectie.naam +
        " weghalen? Het gedeelde materiaal in deze sectie (" +
        sectie.aantalGedeeld +
        ") verdwijnt daarmee. De eigen lessen en toetsen van docenten blijven staan."
    );
    if (!bevestiging) return;

    setBezig(true);
    setFout(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .schema("facula")
        .from("sections")
        .delete()
        .eq("id", sectie.id);
      if (error) throw new Error("Weghalen lukte niet.");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Weghalen lukte niet.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="space-y-6">
      {secties.length === 0 ? (
        <EmptyState tekst="Er zijn nog geen secties. Maak er een per vak of per team, zodat docenten materiaal met de juiste collega's kunnen delen." />
      ) : (
        <ul className="divide-y-2 divide-lijn overflow-hidden rounded-2xl border-2 border-lijn">
          {secties.map((sectie) => (
            <li key={sectie.id} className="bg-ivoor px-5 py-4">
              {wijzigId === sectie.id ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field label="Nieuwe naam">
                      {(ids) => (
                        <input
                          {...ids}
                          type="text"
                          maxLength={120}
                          value={wijzigNaam}
                          onChange={(e) => setWijzigNaam(e.target.value)}
                          className={VELD_KLASSEN}
                        />
                      )}
                    </Field>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={() => hernoem(sectie.id)}
                      disabled={bezig}
                    >
                      Opslaan
                    </Button>
                    <Button variant="secondary" onClick={() => setWijzigId(null)}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <span className="block text-lg font-semibold text-marine">
                      {sectie.naam}
                    </span>
                    <span className="mt-1 block text-base text-tekst-zacht">
                      {sectie.aantalDocenten}{" "}
                      {sectie.aantalDocenten === 1 ? "docent" : "docenten"} ·{" "}
                      {sectie.aantalGedeeld} gedeeld
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setWijzigId(sectie.id);
                        setWijzigNaam(sectie.naam);
                      }}
                    >
                      Naam wijzigen
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => verwijder(sectie)}
                      disabled={bezig}
                    >
                      Weghalen
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {fout && <ErrorNotice melding={fout} />}

      <form onSubmit={voegToe} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field
            label="Nieuwe sectie"
            hulptekst="Bijvoorbeeld Maatschappijleer, of Onderbouw."
          >
            {(ids) => (
              <input
                {...ids}
                type="text"
                maxLength={120}
                value={nieuweNaam}
                onChange={(e) => setNieuweNaam(e.target.value)}
                className={VELD_KLASSEN}
              />
            )}
          </Field>
        </div>
        <Button type="submit" variant="secondary" disabled={bezig}>
          Sectie toevoegen
        </Button>
      </form>
    </div>
  );
}
