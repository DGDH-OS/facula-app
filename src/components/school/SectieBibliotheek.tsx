"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/PageHeader";
import { ErrorNotice, SuccessNotice } from "@/components/ui/Notice";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { tijdGeleden } from "@/components/app/RecenteLijst";

/**
 * Wat er in de sectie gedeeld is, met per item "Overnemen".
 *
 * Overnemen loopt via facula.copy_share_to_own(): die maakt een kopie op naam
 * van wie hem overneemt. Bewust een kopie en geen gedeelde rij, zodat een
 * collega hem daarna vrij kan aanpassen zonder het materiaal van de maker te
 * raken. Het kost geen quotum: er komt geen AI aan te pas, en een bibliotheek
 * waar meelezen geld kost, wordt niet gebruikt.
 *
 * Vrijgeven als sectiestandaard kan alleen een sectievoorzitter of de
 * beheerder. De knop staat er dus alleen voor hen; de database weigert het ook
 * voor de rest (policy section_shares_update_voorzitter), dus dit is de
 * vriendelijke laag en niet het slot.
 */

export interface DelingRij {
  id: string;
  soort: "lessons" | "tests";
  titel: string;
  vanMij: boolean;
  isSectiestandaard: boolean;
  createdAt: string;
}

const SOORT_LABEL: Record<DelingRij["soort"], string> = {
  lessons: "Les",
  tests: "Toets",
};

export function SectieBibliotheek({
  delingen,
  magVrijgeven,
}: {
  delingen: DelingRij[];
  magVrijgeven: boolean;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState<{ tekst: string; href: string } | null>(null);

  async function neemOver(deling: DelingRij) {
    setBezig(deling.id);
    setFout(null);
    setGelukt(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .schema("facula")
        .rpc("copy_share_to_own", { p_share_id: deling.id })
        .single();

      if (error || !data) throw new Error("Overnemen lukte niet.");

      const rij = data as { status: string; content_id: string | null; kind: string | null };
      if (rij.status !== "ok" || !rij.content_id) {
        throw new Error(
          rij.status === "niet_gevonden"
            ? "Dit materiaal is er niet meer, of het hoort niet bij jouw sectie."
            : "Overnemen lukte niet."
        );
      }

      const pad = rij.kind === "tests" ? "/app/tests/" : "/app/lessons/";
      setGelukt({
        tekst: deling.titel + " staat nu bij jouw werk. Je kunt hem daar aanpassen.",
        href: pad + rij.content_id,
      });
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Overnemen lukte niet.");
    } finally {
      setBezig(null);
    }
  }

  async function zetStandaard(deling: DelingRij, aan: boolean) {
    setBezig(deling.id);
    setFout(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .schema("facula")
        .from("section_shares")
        .update({ is_sectiestandaard: aan })
        .eq("id", deling.id);
      if (error) throw new Error("Wijzigen lukte niet.");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Wijzigen lukte niet.");
    } finally {
      setBezig(null);
    }
  }

  async function haalWeg(deling: DelingRij) {
    const bevestiging = window.confirm(
      deling.titel +
        " uit de sectiebibliotheek halen? Je eigen versie blijft staan, collega's kunnen hem daarna niet meer overnemen."
    );
    if (!bevestiging) return;

    setBezig(deling.id);
    setFout(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .schema("facula")
        .from("section_shares")
        .delete()
        .eq("id", deling.id);
      if (error) throw new Error("Weghalen lukte niet.");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Weghalen lukte niet.");
    } finally {
      setBezig(null);
    }
  }

  if (delingen.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState tekst="Er is nog niets gedeeld in je sectie. Deel hieronder je eerste les of toets, dan kunnen je collega's hem gebruiken." />
        {fout && <ErrorNotice melding={fout} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {gelukt && (
        <SuccessNotice
          melding={gelukt.tekst}
          actie={
            <Button variant="secondary" onClick={() => router.push(gelukt.href)}>
              Openen
            </Button>
          }
        />
      )}
      {fout && <ErrorNotice melding={fout} />}

      <ul className="divide-y-2 divide-lijn overflow-hidden rounded-2xl border-2 border-lijn">
        {delingen.map((deling) => (
          <li key={deling.id} className="bg-ivoor px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold text-marine">{deling.titel}</span>
                  {deling.isSectiestandaard && (
                    <StatusBadge
                      label="Sectiestandaard"
                      tone="success"
                      uitleg="Dit is het materiaal waarvan de sectie heeft afgesproken dat het de norm is"
                    />
                  )}
                </div>
                <span className="mt-1 block text-base text-tekst-zacht">
                  {SOORT_LABEL[deling.soort]} ·{" "}
                  {deling.vanMij ? "door jou gedeeld" : "van een collega"} ·{" "}
                  {tijdGeleden(deling.createdAt)}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => neemOver(deling)}
                disabled={bezig === deling.id}
              >
                {bezig === deling.id ? "Bezig..." : "Overnemen naar mijn werk"}
              </Button>

              {magVrijgeven && (
                <Button
                  variant="ghost"
                  onClick={() => zetStandaard(deling, !deling.isSectiestandaard)}
                  disabled={bezig === deling.id}
                >
                  {deling.isSectiestandaard
                    ? "Geen sectiestandaard meer"
                    : "Vrijgeven als sectiestandaard"}
                </Button>
              )}

              {(deling.vanMij || magVrijgeven) && (
                <Button
                  variant="ghost"
                  onClick={() => haalWeg(deling)}
                  disabled={bezig === deling.id}
                >
                  Uit de bibliotheek halen
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
