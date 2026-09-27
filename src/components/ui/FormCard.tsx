import type { FormEvent, ReactNode } from "react";

/**
 * Eén formulier-kaart-patroon voor lessen/toetsen/rapporten: zelfde
 * rand, achtergrond en spacing overal, zodat het aanleren van één
 * module ook geldt voor de andere twee.
 */
export function FormCard({
  children,
  onSubmit,
  className = "",
}: {
  children: ReactNode;
  onSubmit: (e: FormEvent) => void;
  className?: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`space-y-6 rounded-2xl border-2 border-lijn bg-ivoor-deep p-6 ${className}`}
    >
      {children}
    </form>
  );
}

/** Lege-staat/voorbeeld-vak, consistent voor toets- en rapport-preview. */
export function PreviewPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-75 items-center justify-center rounded-2xl border-2 border-dashed border-lijn p-6 text-center text-base text-tekst-zacht">
      {children}
    </div>
  );
}
