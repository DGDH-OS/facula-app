import { ButtonLink } from "@/components/ui/Button";

export interface Tier {
  naam: string;
  /**
   * Maandprijs per docent, of "aanvraag" als er geen vast bedrag is.
   *
   * Een schoollicentie heeft geen bedrag dat op een pagina kan staan: dat
   * hangt af van het aantal docentplekken en de staffel, en een getal dat
   * later anders blijkt kost meer vertrouwen dan het oplevert.
   */
  prijs: number | "aanvraag";
  beschrijving: string;
  features: string[];
  uitgelicht: boolean;
  /** Waar de knop heen gaat. Standaard de gratis proefperiode. */
  ctaHref?: string;
  ctaLabel?: string;
  /** Eén regel onder de prijs, bijvoorbeeld over facturering. */
  prijsToelichting?: string;
}

/**
 * De pakketten stonden woord-voor-woord gedupliceerd in de homepage en
 * /pricing. Eén bron, zodat een prijswijziging niet half doorkomt.
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
      "Export naar PowerPoint en Word",
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
      "Eigen huisstijl en schoollogo",
      "Onderdelen aanpassen en opnieuw maken",
    ],
    uitgelicht: true,
  },
  {
    naam: "School",
    prijs: "aanvraag",
    beschrijving:
      "Voor een sectie, een afdeling of de hele school. Eén factuur per jaar.",
    features: [
      "Een plek per docent, met staffel",
      "Beheerpaneel: docenten, secties en gebruik",
      "Eén schoolhuisstijl voor iedereen",
      "Gedeelde sectiebibliotheek",
      "Verwerkersovereenkomst en data in de EU",
      "Pilot van zes weken om te beginnen",
    ],
    uitgelicht: false,
    ctaHref: "/scholen#aanvragen",
    ctaLabel: "Schoollicentie aanvragen",
    prijsToelichting: "Afhankelijk van het aantal docentplekken",
  },
];

/**
 * Het uitgelichte pakket staat op marine en krijgt daarom `.op-donker`:
 * dat zet de tekstkleur en draait de focusring om, zodat de ring op het
 * donkere vlak zichtbaar blijft.
 *
 * `kopNiveau` bestaat omdat dezelfde kaart op de homepage onder een h2
 * hangt en op /pricing onder de h1: de koppenhiërarchie mag geen niveau
 * overslaan.
 */
export function PrijsKaart({
  tier,
  kopNiveau = "h3",
}: {
  tier: Tier;
  kopNiveau?: "h2" | "h3";
}) {
  const Kop = kopNiveau;
  const zachteTekst = tier.uitgelicht ? "text-op-donker-zacht" : "text-tekst-zacht";
  const toelichting =
    tier.prijsToelichting ??
    (typeof tier.prijs === "number"
      ? "of €" + tier.prijs * 10 + " per jaar, 2 maanden gratis"
      : "");

  return (
    <div
      className={
        "flex flex-col rounded-2xl border-2 p-8 " +
        (tier.uitgelicht
          ? "op-donker border-marine bg-marine"
          : "border-lijn bg-ivoor-deep")
      }
    >
      {tier.uitgelicht && (
        <span className="mb-4 inline-block w-fit rounded-full bg-ivoor px-3 py-1 text-sm font-semibold text-marine">
          Meest gekozen
        </span>
      )}

      <Kop
        className={
          "font-display text-xl " + (tier.uitgelicht ? "" : "text-marine")
        }
      >
        {tier.naam}
      </Kop>

      <p className={"mt-2 text-base " + zachteTekst}>{tier.beschrijving}</p>

      {tier.prijs === "aanvraag" ? (
        <p className="mt-6 font-display text-3xl">Prijs op aanvraag</p>
      ) : (
        <p className="mt-6 flex items-baseline gap-2">
          <span className="font-display text-4xl">€{tier.prijs}</span>
          <span className={"text-base " + zachteTekst}>per maand</span>
        </p>
      )}

      {toelichting && <p className={"mt-1 text-base " + zachteTekst}>{toelichting}</p>}

      <ul className="mt-8 flex-1 space-y-3 text-base">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span aria-hidden>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <ButtonLink
        href={tier.ctaHref ?? "/signup"}
        variant={tier.uitgelicht ? "omgekeerd" : "primary"}
        volleBreedte
        className="mt-8"
      >
        {tier.ctaLabel ?? "Probeer gratis"}
      </ButtonLink>
    </div>
  );
}
