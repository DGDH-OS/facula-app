"use client";

import Link from "next/link";
import { useId } from "react";
import type { Huisstijl } from "@/lib/huisstijl/themes";

/**
 * De twee schakelaars boven elke download: eigen huisstijl gebruiken, en het
 * schoollogo tonen.
 *
 * Compact gehouden, want dit is een bijzaak naast de downloadknop. Wel met
 * volwaardige vakjes van 24px en labels van 18px: de doelgroep is 60+ en een
 * klein grijs schakelaartje is hier precies het verkeerde patroon.
 *
 * De logo-schakelaar staat uit en is uitgeschakeld zolang er geen logo is
 * ingesteld. Uitgeschakeld zonder uitleg is onbruikbaar, dus er staat altijd
 * een zin bij die naar de huisstijlpagina wijst.
 */
export function HuisstijlSchakelaars({
  huisstijl,
  huisstijlAan,
  logoAan,
  onHuisstijl,
  onLogo,
  huisstijlLabel = "Mijn huisstijl gebruiken",
}: {
  huisstijl: Huisstijl;
  huisstijlAan: boolean;
  logoAan: boolean;
  onHuisstijl: (aan: boolean) => void;
  onLogo: (aan: boolean) => void;
  huisstijlLabel?: string;
}) {
  const basis = useId();
  const huisstijlId = basis + "-huisstijl";
  const logoId = basis + "-logo";
  const logoUitlegId = basis + "-logo-uitleg";
  const heeftLogo = Boolean(huisstijl.logoPath);

  return (
    <div className="rounded-xl border-2 border-lijn bg-ivoor-deep p-5">
      <fieldset>
        <legend className="text-base font-semibold text-marine">
          Hoe wil je het downloaden?
        </legend>

        <div className="mt-3 flex flex-col gap-3">
          <label
            htmlFor={huisstijlId}
            className="flex min-h-12 cursor-pointer items-center gap-3"
          >
            <input
              id={huisstijlId}
              type="checkbox"
              checked={huisstijlAan}
              onChange={(e) => onHuisstijl(e.target.checked)}
              className="h-6 w-6 shrink-0 accent-marine"
            />
            <span className="text-base text-tekst">{huisstijlLabel}</span>
          </label>

          <label htmlFor={logoId} className={logoLabelKlassen(heeftLogo)}>
            <input
              id={logoId}
              type="checkbox"
              checked={heeftLogo && logoAan}
              disabled={!heeftLogo}
              aria-describedby={heeftLogo ? undefined : logoUitlegId}
              onChange={(e) => onLogo(e.target.checked)}
              className="h-6 w-6 shrink-0 accent-marine"
            />
            <span className={heeftLogo ? "text-base text-tekst" : "text-base text-tekst-zacht"}>
              Schoollogo tonen
            </span>
          </label>
        </div>
      </fieldset>

      <p id={logoUitlegId} className="mt-3 text-base text-tekst-zacht">
        {heeftLogo ? "Je kleuren en logo pas je aan bij " : "Je hebt nog geen schoollogo ingesteld. Dat kan bij "}
        <Link
          href="/app/huisstijl"
          className="font-semibold text-marine underline underline-offset-4"
        >
          Huisstijl
        </Link>
        .
      </p>
    </div>
  );
}

/** Een uitgeschakeld vakje hoort ook als uitgeschakeld te voelen onder de muis. */
function logoLabelKlassen(heeftLogo: boolean): string {
  return (
    "flex min-h-12 items-center gap-3 " +
    (heeftLogo ? "cursor-pointer" : "cursor-not-allowed")
  );
}
