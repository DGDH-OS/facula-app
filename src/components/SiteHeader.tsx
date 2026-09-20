import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-lijn)] bg-[var(--color-ivoor)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl tracking-tight text-[var(--color-marine)]">
          Facula
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-[var(--color-inkt)]/80 md:flex">
          <Link href="/#hoe-het-werkt" className="hover:text-[var(--color-marine)]">
            Hoe het werkt
          </Link>
          <Link href="/#vakken" className="hover:text-[var(--color-marine)]">
            Vakken
          </Link>
          <Link href="/pricing" className="hover:text-[var(--color-marine)]">
            Prijzen
          </Link>
          <Link href="/#faq" className="hover:text-[var(--color-marine)]">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-[var(--color-inkt)]/80 hover:text-[var(--color-marine)]"
          >
            Inloggen
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[var(--color-marine)] px-5 py-2 text-sm text-[var(--color-ivoor)] transition hover:bg-[var(--color-marine-deep)]"
          >
            Probeer gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
