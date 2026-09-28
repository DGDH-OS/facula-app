"use client";

import {
  cssFontStack,
  lijnKleur,
  zachteTekstKleur,
  type Kleurenset,
} from "@/lib/huisstijl/themes";

/**
 * Een kleine voorvertoning van hoe een dia en een toetskop eruit gaan zien.
 *
 * Bewust twee voorbeelden en niet één: de dia laat zien wat er op de beamer
 * komt, de toetskop wat er op papier komt, en dat zijn andere vlakken. Een
 * docent kiest zijn kleuren hier eenmalig en ziet het pas terug in een
 * download, dus dit moet een echte gelijkenis zijn en geen kleurstaal.
 */
export function HuisstijlVoorbeeld({
  kleuren,
  schoolnaam,
  logoUrl,
  toonLogo,
}: {
  kleuren: Kleurenset;
  schoolnaam: string | null;
  logoUrl: string | null;
  toonLogo: boolean;
}) {
  const font = cssFontStack(kleuren.lettertype);
  const lijn = lijnKleur(kleuren);
  const zacht = zachteTekstKleur(kleuren);
  const logo = toonLogo ? logoUrl : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="m-0">
        <div
          className="aspect-video overflow-hidden rounded-lg border-2"
          style={{ backgroundColor: kleuren.achtergrond, borderColor: lijn, fontFamily: font }}
          role="img"
          aria-label="Voorbeeld van een dia in deze kleuren"
        >
          <div style={{ height: "6px", backgroundColor: kleuren.accent }} />
          <div className="flex items-start justify-between gap-2 px-4 pt-3">
            <p className="m-0 text-sm" style={{ color: zacht }}>
              LES 1 VAN 2
            </p>
            {logo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logo} alt="" className="h-5 w-auto object-contain" />
            )}
          </div>
          <p
            className="m-0 px-4 pt-1 text-lg font-bold"
            style={{ color: kleuren.accent }}
          >
            Casus met concrete cijfers
          </p>
          <div className="mx-4 mt-2" style={{ height: "1px", backgroundColor: lijn }} />
          <ul className="m-0 mt-2 list-disc space-y-1 pl-9 pr-4 text-sm" style={{ color: kleuren.tekst }}>
            <li>Cameratoezicht in de stad</li>
            <li>Veiligheid tegenover privacy</li>
          </ul>
        </div>
        <figcaption className="mt-2 text-base text-tekst-zacht">Een dia in je les</figcaption>
      </figure>

      <figure className="m-0">
        <div
          className="overflow-hidden rounded-lg border-2 p-4"
          style={{ backgroundColor: "#FFFFFF", borderColor: lijn, fontFamily: font }}
          role="img"
          aria-label="Voorbeeld van een toetskop in deze kleuren"
        >
          {logo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logo} alt="" className="mb-2 h-6 w-auto object-contain" />
          )}
          {schoolnaam && (
            <p className="m-0 text-sm" style={{ color: zacht }}>
              {schoolnaam}
            </p>
          )}
          <p className="m-0 mt-1 text-lg font-bold" style={{ color: kleuren.accent }}>
            Toets rechtsstaat
          </p>
          <div className="mt-1" style={{ height: "2px", backgroundColor: kleuren.accent }} />
          <p className="m-0 mt-2 text-sm" style={{ color: zacht }}>
            havo 4 · 10 vragen · 19 punten
          </p>
          <p className="m-0 mt-3 text-sm" style={{ color: kleuren.tekst }}>
            1. Noem drie kenmerken van een rechtsstaat.
          </p>
        </div>
        <figcaption className="mt-2 text-base text-tekst-zacht">
          De kop van je toets
        </figcaption>
      </figure>
    </div>
  );
}
