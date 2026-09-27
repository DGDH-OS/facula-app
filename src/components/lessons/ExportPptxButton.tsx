"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Verplaatst vanuit de generatie-flow (`/app/lessons/new`) naar de
 * les-detailpagina: export hoort bij de opgeslagen les, niet bij het
 * generatie-moment zelf.
 */
export function ExportPptxButton({ lessonId }: { lessonId: string }) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function exporteer() {
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
      setFout(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="primary" onClick={exporteer} disabled={bezig}>
        {bezig ? "Bezig met maken..." : "Download als PowerPoint"}
      </Button>
      {fout && (
        <p
          aria-live="polite"
          className="rounded-lg border-2 border-fout-tekst bg-fout-vlak px-4 py-3 text-base font-medium text-fout-tekst"
        >
          {fout}
        </p>
      )}
    </div>
  );
}
