"use client";

import { useState, type ReactNode } from "react";

/**
 * Herbruikbaar inklap-patroon voor "geavanceerde" formuliervelden.
 * Kernvelden staan altijd zichtbaar in het formulier zelf; alles wat
 * hierin zit is optioneel en heeft al een verstandige default.
 */
export function MoreOptions({
  children,
  label = "Instellingen aanpassen",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t-2 border-lijn pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-14 items-center gap-2 text-base font-semibold text-marine underline underline-offset-4"
      >
        <span
          className={`inline-block transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          aria-hidden
        >
          ›
        </span>
        {open ? "Verberg instellingen" : label}
      </button>

      {open && <div className="mt-4 grid gap-5 sm:grid-cols-2">{children}</div>}
    </div>
  );
}
