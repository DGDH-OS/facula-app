import { ButtonLink } from "@/components/ui/Button";

export interface Tier {
  naam: string;
  prijs: number;
  beschrijving: string;
  features: string[];
  uitgelicht: boolean;
}

/**
 * De drie pakketten stonden woord-voor-woord gedupliceerd in `/` en
 * `/pricing`. Eén bron, zodat een prijswijziging niet half doorkomt.
 */
export const TIERS: Tier[] = [
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
      "Onderdelen aanpassen en opnieuw maken",
    ],
    uitgelicht: true,
  },
  {
    naam: "Premium",
    prijs: 49,
    beschrijving: "Voor de docent die ook eigen huisstijl en sjablonen wil.",
    features: [
      "Alles uit Actief",
      "Eigen sjabloon of huisstijl uploaden",
      "Voorrang bij nieuwe vakken en functies",
      "Persoonlijke onboarding",
    ],
    uitgelicht: false,
  },
];

/**
 * Het uitgelichte pakket staat op marine en krijgt daarom `.op-donker`:
 * dat zet de tekstkleur én draait de focusring om, zodat de ring op het
 * donkere vlak zichtbaar blijft.
 *
 * `kopNiveau` bestaat omdat dezelfde kaart op de homepage onder een h2
 * hangt en op `/pricing` onder de h1: de koppenhiërarchie mag geen
 * niveau overslaan.
 */
export function PrijsKaart({
  tier,
  kopNiveau = "h3",
}: {
  tier: Tier;
  kopNiveau?: "h2" | "h3";
}) {
  const Kop = kopNiveau;

  return (
    <div
      className={`flex flex-col rounded-2xl border-2 p-8 ${
        tier.uitgelicht
          ? "op-donker border-marine bg-marine"
          : "border-lijn bg-ivoor-deep"
      }`}
    >
      {tier.uitgelicht && (
        <span className="mb-4 inline-block w-fit rounded-full bg-ivoor px-3 py-1 text-sm font-semibold text-marine">
          Meest gekozen
        </span>
      )}

      <Kop
        className={`font-display text-xl ${
          tier.uitgelicht ? "" : "text-marine"
        }`}
      >
        {tier.naam}
      </Kop>

      <p
        className={`mt-2 text-base ${
          tier.uitgelicht ? "text-op-donker-zacht" : "text-tekst-zacht"
        }`}
      >
        {tier.beschrijving}
      </p>

      <p className="mt-6 flex items-baseline gap-2">
        <span className="font-display text-4xl">€{tier.prijs}</span>
        <span
          className={`text-base ${
            tier.uitgelicht ? "text-op-donker-zacht" : "text-tekst-zacht"
          }`}
        >
          per maand
        </span>
      </p>
      <p
        className={`mt-1 text-base ${
          tier.uitgelicht ? "text-op-donker-zacht" : "text-tekst-zacht"
        }`}
      >
        of €{tier.prijs * 10} per jaar, 2 maanden gratis
      </p>

      <ul className="mt-8 flex-1 space-y-3 text-base">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span aria-hidden>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <ButtonLink
        href="/signup"
        variant={tier.uitgelicht ? "omgekeerd" : "primary"}
        volleBreedte
        className="mt-8"
      >
        Start proefperiode
      </ButtonLink>
    </div>
  );
}
