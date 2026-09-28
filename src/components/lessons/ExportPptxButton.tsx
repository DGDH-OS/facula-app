"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProgressNotice } from "@/components/ui/ProgressNotice";

/**
 * De enige hoofdknop op de lesdetailpagina: downloaden als PowerPoint.
 *
 * De knop blijft bewust actief tijdens het maken (brief 10.3: liever geen
 * disabled knoppen). Een tweede klik wordt daarom in code tegengehouden met
 * een ref: state loopt een render achter, een ref niet, dus een dubbelklik
 * kan hier nooit twee downloads starten.
 *
 * De exportlogica zelf (fetch, Content-Disposition, blob-download) is
 * ongewijzigd — alleen de begeleiding eromheen is nieuw.
 */
export function ExportPptxButton({ lessonId }: { lessonId: string }) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const loopt = useRef(false);

  async function exporteer() {
    if (loopt.current) return;
    loopt.current = true;

    setBezig(true);
    setFout(null);

    try {
      const response = await fetch("/api/lessons/" + lessonId + "/pptx");

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "PowerPoint genereren mislukt.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") ?? "";
      const match = contentDisposition.match(/filename="([^"]+)"/);
      const bestandsnaam = match?.[1] ?? "les.pptx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = bestandsnaam;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFout(
        err instanceof Error
          ? err.message
          : "Het downloaden lukte niet. Probeer het opnieuw."
      );
    } finally {
      loopt.current = false;
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="primary"
        onClick={exporteer}
        aria-busy={bezig}
        volleBreedte
        className="sm:w-auto"
      >
        {bezig ? "Bezig met maken..." : "Download als PowerPoint"}
      </Button>

      <ProgressNotice bezig={bezig} tekst="Je PowerPoint wordt gemaakt..." />

      {fout && (
        /* role="alert" in plaats van aria-live: een mislukte download moet
           meteen voorgelezen worden, niet pas als de gebruiker uitgepraat is. */
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4"
        >
          <p className="max-w-[70ch] text-base font-medium text-fout-tekst">{fout}</p>
          <div>
            <Button variant="secondary" onClick={exporteer}>
              Probeer opnieuw
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
