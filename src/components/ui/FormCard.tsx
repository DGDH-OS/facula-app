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
      className={`space-y-5 rounded-2xl border border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] p-6 ${className}`}
    >
      {children}
    </form>
  );
}

/** Lege-staat/voorbeeld-vak, consistent voor toets- en rapport-preview. */
export function PreviewPlaceholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-[var(--color-lijn)] text-center text-sm text-[var(--color-inkt)]/50">
      {children}
    </div>
  );
}
