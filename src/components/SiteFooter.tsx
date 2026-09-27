import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-lijn bg-ivoor-deep">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="font-display text-xl text-marine">Facula</div>
            <p className="mt-3 max-w-xs text-base text-tekst-zacht">
              De les- en toetssuite die Nederlandse kerndoelen vertaalt naar
              kant-en-klaar, herkenbaar lesmateriaal.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-marine">Product</h2>
            <ul className="mt-2 text-base text-tekst">
              <li>
                <Link
                  href="/#hoe-het-werkt"
                  className="inline-flex min-h-14 items-center underline underline-offset-4"
                >
                  Hoe het werkt
                </Link>
              </li>
              <li>
                <Link
                  href="/#vakken"
                  className="inline-flex min-h-14 items-center underline underline-offset-4"
                >
                  Vakken
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="inline-flex min-h-14 items-center underline underline-offset-4"
                >
                  Prijzen
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-base font-semibold text-marine">Account</h2>
            <ul className="mt-2 text-base text-tekst">
              <li>
                <Link
                  href="/login"
                  className="inline-flex min-h-14 items-center underline underline-offset-4"
                >
                  Inloggen
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="inline-flex min-h-14 items-center underline underline-offset-4"
                >
                  Account aanmaken
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-base font-semibold text-marine">Vertrouwen</h2>
            <ul className="mt-2 space-y-2 text-base text-tekst-zacht">
              <li>AVG-vriendelijk, geen leerlingdata nodig</li>
              <li>Export naar PowerPoint, Word en PDF</li>
              <li>Gebouwd voor Nederlandse kerndoelen</li>
              <li>
                <Link
                  href="/privacy"
                  className="inline-flex min-h-14 items-center text-tekst underline underline-offset-4"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/voorwaarden"
                  className="inline-flex min-h-14 items-center text-tekst underline underline-offset-4"
                >
                  Voorwaarden
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t-2 border-lijn pt-6 text-base text-tekst-zacht md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} Facula. Een venture van DGDH OS.</span>
          <span>Demo-omgeving, geen echte betalingen of opslag.</span>
        </div>
      </div>
    </footer>
  );
}
