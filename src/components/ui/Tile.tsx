import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Grote keuzetegel voor het startscherm: icoon + kop + precies één zin.
 * De hele tegel is één link, zodat het klikvlak fors is en er geen
 * geneste klikbare elementen ontstaan.
 */
export function Tile({
  href,
  icoon,
  kop,
  zin,
  extra,
}: {
  href: string;
  icoon: ReactNode;
  kop: string;
  zin: string;
  /** Bijv. een AVG-waarschuwing. Geen link of knop: tegel is al één link. */
  extra?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-40 flex-col rounded-2xl border-2 border-marine bg-ivoor-deep p-6 transition-colors duration-200 hover:bg-marine"
    >
      <span className="text-marine group-hover:text-op-donker">{icoon}</span>
      <span className="mt-4 font-display text-2xl text-marine group-hover:text-op-donker">
        {kop}
      </span>
      <span className="mt-2 text-base text-tekst-zacht group-hover:text-op-donker-zacht">
        {zin}
      </span>
      {extra && <span className="mt-3 block">{extra}</span>}
    </Link>
  );
}
