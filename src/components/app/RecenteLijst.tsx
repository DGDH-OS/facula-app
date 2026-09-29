import Link from "next/link";

/**
 * "Je laatste werk": een lijst met alle drie de soorten door elkaar, nieuwste
 * eerst.
 *
 * Eerder stonden hier alleen lessen, met eronder een regel die zei dat toetsen
 * en rapporten niet meer te openen waren. Dat was waar (die pagina's bestonden
 * niet) en precies het soort antwoord waar een docent niets aan heeft. Nu
 * heeft elk item een eigen pagina en is deze lijst dus overal heen te volgen.
 *
 * Bij een rapport staat bewust alleen de soort en de datum, niet het
 * leerling-label: dit overzicht staat open op een computer in een
 * docentenkamer, en de naam van een leerling hoort daar niet ongevraagd in
 * beeld. Wie de tekst opent ziet hem wel, dat is een keuze van de docent.
 */

export type RecentSoort = "les" | "toets" | "rapport";

export interface RecentItem {
  id: string;
  soort: RecentSoort;
  titel: string;
  /** Eén korte regel met vak/niveau of soort tekst. */
  detail: string;
  createdAt: string;
}

const SOORT_LABEL: Record<RecentSoort, string> = {
  les: "Les",
  toets: "Toets",
  rapport: "Tekst",
};

const SOORT_PAD: Record<RecentSoort, string> = {
  les: "/app/lessons/",
  toets: "/app/tests/",
  rapport: "/app/reports/",
};

/** "vandaag", "gisteren", "3 dagen geleden": leesbaarder dan een datum. */
export function tijdGeleden(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const dagen = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dagen <= 0) return "vandaag";
  if (dagen === 1) return "gisteren";
  if (dagen < 7) return dagen + " dagen geleden";
  const weken = Math.floor(dagen / 7);
  if (weken === 1) return "vorige week";
  return weken + " weken geleden";
}

export function RecenteLijst({ items }: { items: RecentItem[] }) {
  return (
    <ul className="divide-y-2 divide-lijn overflow-hidden rounded-2xl border-2 border-lijn">
      {items.map((item) => (
        <li key={item.soort + item.id}>
          <Link
            href={SOORT_PAD[item.soort] + item.id}
            className="flex min-h-20 flex-col justify-center gap-1 bg-ivoor px-5 py-4 transition-colors duration-200 hover:bg-ivoor-deep sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <span className="min-w-0">
              <span className="block text-lg font-semibold text-marine">{item.titel}</span>
              <span className="mt-1 block text-base text-tekst-zacht sm:hidden">
                {SOORT_LABEL[item.soort]} · {item.detail} · {tijdGeleden(item.createdAt)}
              </span>
            </span>
            <span className="hidden shrink-0 text-base text-tekst-zacht sm:block">
              {SOORT_LABEL[item.soort]} · {item.detail} · {tijdGeleden(item.createdAt)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
