"use client";

import { useState } from "react";

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
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={exporteer}
        disabled={bezig}
        className="rounded-full bg-[var(--color-marine)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)] disabled:cursor-wait disabled:opacity-60"
      >
        {bezig ? "Bezig…" : "Exporteer naar PowerPoint"}
      </button>
      {fout && <p className="text-xs text-red-600">{fout}</p>}
    </div>
  );
}
