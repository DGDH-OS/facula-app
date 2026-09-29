"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field, VELD_KLASSEN } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/PageHeader";
import { ErrorNotice, SuccessNotice } from "@/components/ui/Notice";

/**
 * Een eigen les of toets delen met de sectie.
 *
 * Het delen zet een MOMENTOPNAME in facula.section_shares: de input en output
 * zoals ze nu zijn, niet een verwijzing naar de rij van de maker. Daardoor
 * verandert wat de sectie ziet niet doordat de maker later iets bijschaaft, en
 * hoeft niemand langs de RLS van een collega te kijken. Zie keuze 4 in
 * 20260929130000_facula_school.sql.
 *
 * De inhoud wordt hier eerst opnieuw uit de eigen rij gelezen en dan
 * meegestuurd. Dat kan veilig: RLS geeft alleen de eigen lessen en toetsen
 * terug, en de insert-policy eist dat owner_id de eigen user-id is en de sectie
 * de eigen sectie. Een verzoek met andermans inhoud komt er dus niet door.
 */

export interface DeelbaarItem {
  id: string;
  soort: "lessons" | "tests";
  titel: string;
  detail: string;
}

export function DeelKiezer({
  items,
  sectieNaam,
}: {
  items: DeelbaarItem[];
  sectieNaam: string;
}) {
  const router = useRouter();
  const [keuze, setKeuze] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [gedeeld, setGedeeld] = useState<string | null>(null);

  async function deel(e: React.FormEvent) {
    e.preventDefault();
    if (!keuze) {
      setFout("Kies eerst een les of toets.");
      return;
    }
    setBezig(true);
    setFout(null);
    setGedeeld(null);

    try {
      const item = items.find((i) => i.soort + ":" + i.id === keuze);
      if (!item) throw new Error("Kies eerst een les of toets.");

      const supabase = createClient();

      const { data: lidmaatschap } = await supabase
        .schema("facula")
        .from("school_members")
        .select("school_id, section_id")
        .eq("status", "active")
        .maybeSingle();

      if (!lidmaatschap?.school_id || !lidmaatschap.section_id) {
        throw new Error("Je hoort nog niet bij een sectie. Vraag je beheerder.");
      }

      const { data: bron, error: bronFout } = await supabase
        .schema("facula")
        .from(item.soort)
        .select("input, output")
        .eq("id", item.id)
        .maybeSingle();

      if (bronFout || !bron) throw new Error("Deze les of toets is niet te lezen.");

      const { error } = await supabase.schema("facula").from("section_shares").insert({
        school_id: lidmaatschap.school_id,
        section_id: lidmaatschap.section_id,
        kind: item.soort,
        titel: item.titel,
        input: bron.input,
        output: bron.output,
        // owner_id wordt door de policy tegen auth.uid() gehouden; hier staat
        // hij expliciet zodat de insert niet van een default afhangt.
        owner_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw new Error("Delen lukte niet. Hoor je bij deze sectie?");

      setGedeeld(item.titel);
      setKeuze("");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Delen lukte niet.");
    } finally {
      setBezig(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState tekst="Je hebt nog geen lessen of toetsen om te delen. Maak er eerst een, dan kun je hem hier met je sectie delen." />
    );
  }

  return (
    <form onSubmit={deel} className="space-y-5">
      <Field
        label="Wat wil je delen?"
        hulptekst={"Je collega's in de sectie " + sectieNaam + " kunnen dit overnemen."}
      >
        {(ids) => (
          <select
            {...ids}
            value={keuze}
            onChange={(e) => setKeuze(e.target.value)}
            className={VELD_KLASSEN}
          >
            <option value="">Kies een les of toets</option>
            {items.map((item) => (
              <option key={item.soort + ":" + item.id} value={item.soort + ":" + item.id}>
                {(item.soort === "tests" ? "Toets: " : "Les: ") +
                  item.titel +
                  " (" +
                  item.detail +
                  ")"}
              </option>
            ))}
          </select>
        )}
      </Field>

      {fout && <ErrorNotice melding={fout} />}
      {gedeeld && (
        <SuccessNotice
          melding={gedeeld + " staat nu in de sectiebibliotheek. Je eigen versie blijft van jou."}
        />
      )}

      <Button type="submit" variant="primary" disabled={bezig}>
        {bezig ? "Bezig met delen..." : "Delen met mijn sectie"}
      </Button>
    </form>
  );
}
