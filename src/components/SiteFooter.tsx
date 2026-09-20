import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)]">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="font-display text-lg text-[var(--color-marine)]">Facula</div>
            <p className="mt-3 max-w-xs text-sm text-[var(--color-inkt)]/70">
              De les- en toetssuite die Nederlandse kerndoelen vertaalt naar
              kant-en-klaar, herkenbaar lesmateriaal.
            </p>
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--color-marine)]">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-inkt)]/70">
              <li><Link href="/#hoe-het-werkt" className="hover:text-[var(--color-marine)]">Hoe het werkt</Link></li>
              <li><Link href="/#vakken" className="hover:text-[var(--color-marine)]">Vakken</Link></li>
              <li><Link href="/pricing" className="hover:text-[var(--color-marine)]">Prijzen</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--color-marine)]">Account</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-inkt)]/70">
              <li><Link href="/login" className="hover:text-[var(--color-marine)]">Inloggen</Link></li>
              <li><Link href="/signup" className="hover:text-[var(--color-marine)]">Account aanmaken</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--color-marine)]">Vertrouwen</div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-inkt)]/70">
              <li>AVG-vriendelijk — geen leerlingdata nodig</li>
              <li>Export naar PowerPoint, Word en PDF</li>
              <li>Gebouwd voor Nederlandse kerndoelen</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-[var(--color-lijn)] pt-6 text-xs text-[var(--color-inkt)]/50 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Facula. Een venture van DGDH OS.</span>
          <span>Demo-omgeving — geen echte betalingen of opslag.</span>
        </div>
      </div>
    </footer>
  );
}
