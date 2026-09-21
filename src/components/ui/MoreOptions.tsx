"use client";

import { useState, type ReactNode } from "react";

/**
 * Herbruikbaar inklap-patroon voor "geavanceerde" formuliervelden.
 * Kernvelden staan altijd zichtbaar in het formulier zelf; alles wat
 * hierin zit is optioneel en heeft al een verstandige default.
 */
export function MoreOptions({
  children,
  label = "Meer opties",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-[var(--color-lijn)] pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-inkt)]/60 transition hover:text-[var(--color-marine)]"
      >
        <span
          className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ›
        </span>
        {open ? "Verberg opties" : label}
      </button>

      {open && <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>}
    </div>
  );
}
