import type { ReactNode } from "react";

/**
 * Eigen, minimale icon-set als inline SVG. Bewust geen icon-package:
 * dit zijn drie iconen en een pakket zou alleen bundelgewicht toevoegen.
 *
 * Elk icoon is `aria-hidden`: in deze app staat er altijd een tekstlabel
 * naast, dus een icoon dat óók wordt voorgelezen is dubbelop.
 */
function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Open boek — een les. */
export function LesIcon() {
  return (
    <IconFrame>
      <path d="M12 6.5C10.5 5.2 8.6 4.5 6 4.5H3v13h3c2.6 0 4.5.7 6 2 1.5-1.3 3.4-2 6-2h3v-13h-3c-2.6 0-4.5.7-6 2Z" />
      <path d="M12 6.5v13" />
    </IconFrame>
  );
}

/** Blad met vinkje — een toets. */
export function ToetsIcon() {
  return (
    <IconFrame>
      <path d="M8 3.5h8a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <path d="M9.5 9h5" />
      <path d="M9.5 12.5h5" />
      <path d="M9.5 16h2.5" />
    </IconFrame>
  );
}

/** Tekstballon — een rapport of oudermail. */
export function RapportIcon() {
  return (
    <IconFrame>
      <path d="M20.5 12.5a7.5 7.5 0 0 1-7.5 7.5c-1.2 0-2.3-.3-3.3-.8L4.5 21l1.4-4.1A7.5 7.5 0 1 1 20.5 12.5Z" />
      <path d="M9 11h6" />
      <path d="M9 14.5h4" />
    </IconFrame>
  );
}
