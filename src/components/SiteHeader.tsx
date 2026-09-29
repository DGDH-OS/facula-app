import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-lijn bg-ivoor">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
        <Link
          href="/"
          className="inline-flex min-h-14 items-center font-display text-xl text-marine"
        >
          Facula
        </Link>
        {/* Vier bestemmingen, en "Voor scholen" is de nieuwe: een teamleider
            die hier komt moet niet eerst het docentenverhaal doorlezen. */}
        <nav aria-label="Hoofdmenu" className="hidden items-center gap-6 md:flex">
          <Link
            href="/#hoe-het-werkt"
            className="inline-flex min-h-14 items-center text-base text-tekst"
          >
            Hoe het werkt
          </Link>
          <Link
            href="/scholen"
            className="inline-flex min-h-14 items-center text-base text-tekst"
          >
            Voor scholen
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-14 items-center text-base text-tekst"
          >
            Prijzen
          </Link>
          <Link
            href="/#faq"
            className="inline-flex min-h-14 items-center text-base text-tekst"
          >
            Vragen
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/login"
            className="inline-flex min-h-14 items-center text-base font-medium text-marine underline underline-offset-4"
          >
            Inloggen
          </Link>
          <ButtonLink href="/signup" variant="primary">
            Probeer gratis
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
