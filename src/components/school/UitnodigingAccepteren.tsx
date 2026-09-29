"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorNotice, SuccessNotice } from "@/components/ui/Notice";

/**
 * De knop die de uitnodiging accepteert.
 *
 * Bewust een knop en geen automatische actie bij het laden van de pagina: een
 * mailprogramma dat links vooraf opent zou de uitnodiging anders opgebruiken.
 *
 * De uitkomst komt van de server en wordt hier alleen getoond. Elke reden om te
 * weigeren (verlopen, verkeerd adres, school vol, al lid van een andere school)
 * heeft daar zijn eigen zin; dit component verzint er niets bij.
 */
export function UitnodigingAccepteren({ token }: { token: string }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState<{ melding: string; schoolNaam: string | null } | null>(
    null
  );
  const loopt = useRef(false);

  async function accepteer() {
    if (loopt.current) return;
    loopt.current = true;
    setBezig(true);
    setFout(null);

    try {
      const response = await fetch("/api/school/uitnodiging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Accepteren lukte niet.");
      }

      setGelukt({
        melding: data?.melding ?? "Je hoort nu bij deze school.",
        schoolNaam: data?.schoolNaam ?? null,
      });
      // De navigatiebalk en het startscherm hangen aan het lidmaatschap, dus
      // die moeten opnieuw van de server komen.
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Accepteren lukte niet.");
    } finally {
      loopt.current = false;
      setBezig(false);
    }
  }

  if (gelukt) {
    return (
      <div className="space-y-6">
        <SuccessNotice
          melding={
            gelukt.schoolNaam
              ? "Je hoort nu bij " + gelukt.schoolNaam + "."
              : gelukt.melding
          }
        />
        <p className="max-w-[62ch] text-base text-tekst">
          Vanaf nu gebruik je de licentie van je school en de huisstijl die daar
          is ingesteld. Je eigen lessen, toetsen en teksten blijven van jou.
        </p>
        <ButtonLink href="/app" variant="primary">
          Naar je startscherm
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="primary" onClick={accepteer} disabled={bezig} aria-busy={bezig}>
        {bezig ? "Bezig met accepteren..." : "Uitnodiging accepteren"}
      </Button>

      {fout && (
        <ErrorNotice
          melding={fout}
          actie={
            <Button variant="secondary" onClick={accepteer}>
              Probeer opnieuw
            </Button>
          }
        />
      )}
    </div>
  );
}
