import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const TIERS = [
  {
    naam: "Starter",
    prijs: 25,
    beschrijving: "Voor de docent die net begint met digitaal lesmateriaal.",
    features: [
      "15 lessen per maand",
      "10 toetsen per maand",
      "1 vak naar keuze",
      "Export naar PDF",
    ],
    uitgelicht: false,
  },
  {
    naam: "Actief",
    prijs: 35,
    beschrijving: "Voor de docent die structureel met Facula werkt.",
    features: [
      "Onbeperkt lessen",
      "Onbeperkt toetsen",
      "Alle vakken",
      "Export naar PowerPoint, Word en PDF",
      "Bewerken & losse onderdelen regenereren",
    ],
    uitgelicht: true,
  },
  {
    naam: "Premium",
    prijs: 49,
    beschrijving: "Voor de docent die ook eigen huisstijl en sjablonen wil.",
    features: [
      "Alles uit Actief",
      "Eigen sjabloon/huisstijl uploaden",
      "Prioriteit bij nieuwe vakken en functies",
      "Persoonlijke onboarding",
    ],
    uitgelicht: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-xl text-center">
            <h1 className="font-display text-4xl text-[var(--color-marine)]">
              Prijzen
            </h1>
            <p className="mt-3 text-[var(--color-inkt)]/70">
              Maandelijks opzegbaar. Bij jaarbetaling 2 maanden gratis.
              Geen creditcard nodig om te starten.
            </p>
          </div>
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.naam}
                className={`flex flex-col rounded-2xl border p-8 ${
                  tier.uitgelicht
                    ? "border-[var(--color-marine)] bg-[var(--color-marine)] text-[var(--color-ivoor)] shadow-lg"
                    : "border-[var(--color-lijn)] bg-[var(--color-ivoor-deep)] text-[var(--color-inkt)]"
                }`}
              >
                {tier.uitgelicht && (
                  <span className="mb-4 inline-block w-fit rounded-full bg-[var(--color-goud)] px-3 py-1 text-xs font-medium text-[var(--color-marine-deep)]">
                    Meest gekozen
                  </span>
                )}
                <h2 className="font-display text-xl">{tier.naam}</h2>
                <p
                  className={`mt-2 text-sm ${
                    tier.uitgelicht ? "text-[var(--color-ivoor)]/70" : "text-[var(--color-inkt)]/70"
                  }`}
                >
                  {tier.beschrijving}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl">€{tier.prijs}</span>
                  <span
                    className={`text-sm ${
                      tier.uitgelicht ? "text-[var(--color-ivoor)]/60" : "text-[var(--color-inkt)]/60"
                    }`}
                  >
                    / maand
                  </span>
                </div>
                <p
                  className={`mt-1 text-xs ${
                    tier.uitgelicht ? "text-[var(--color-ivoor)]/50" : "text-[var(--color-inkt)]/50"
                  }`}
                >
                  of €{tier.prijs * 10} per jaar — 2 maanden gratis
                </p>
                <ul className="mt-8 flex-1 space-y-3 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span
                        className={
                          tier.uitgelicht ? "text-[var(--color-goud)]" : "text-[var(--color-groen)]"
                        }
                      >
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 rounded-full px-6 py-3 text-center text-sm font-medium transition ${
                    tier.uitgelicht
                      ? "bg-[var(--color-ivoor)] text-[var(--color-marine)] hover:bg-[var(--color-ivoor)]/90"
                      : "bg-[var(--color-marine)] text-[var(--color-ivoor)] hover:bg-[var(--color-marine-deep)]"
                  }`}
                >
                  Start proefperiode
                </Link>
              </div>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
