import type { ReactNode } from "react";

/**
 * Een paginakop voor elk scherm in de app: titel, hoogstens een zin uitleg,
 * en rechts precies een hoofdactie.
 *
 * Waarom een component en geen losse h1 per pagina: de koppen stonden op elk
 * scherm iets anders (andere marge, soms een uitlegzin, soms een knop
 * eronder). Voor een docent die eens per week inlogt, is dat elke keer
 * opnieuw zoeken waar de actie zit. Hier staat hij altijd op dezelfde plek,
 * en op een smal scherm valt hij onder de titel in plaats van ernaast.
 */
export function PageHeader({
  titel,
  uitleg,
  actie,
  status,
}: {
  titel: string;
  uitleg?: string;
  actie?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-marine">{titel}</h1>
          {status}
        </div>
        {uitleg && (
          <p className="mt-3 max-w-[70ch] text-base text-tekst-zacht">{uitleg}</p>
        )}
      </div>
      {actie && <div className="shrink-0">{actie}</div>}
    </header>
  );
}

/**
 * Een blok binnen een pagina: zelfde kader, zelfde ruimte, overal. Vervangt de
 * losse kaderblokken die per scherm net iets anders waren.
 */
export function Section({
  titel,
  uitleg,
  actie,
  children,
  className = "",
}: {
  titel?: string;
  uitleg?: string;
  actie?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const heeftKop = Boolean(titel || actie);

  return (
    <section className={`rounded-2xl border-2 border-lijn bg-ivoor-deep p-6 ${className}`}>
      {heeftKop && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {titel && <h2 className="font-display text-xl text-marine">{titel}</h2>}
            {uitleg && (
              <p className="mt-2 max-w-[70ch] text-base text-tekst-zacht">{uitleg}</p>
            )}
          </div>
          {actie && <div className="shrink-0">{actie}</div>}
        </div>
      )}
      {children && <div className={heeftKop ? "mt-5" : ""}>{children}</div>}
    </section>
  );
}

/**
 * Wat er staat als een lijst leeg is: een zin die uitlegt wat je hier zou
 * zien, en de knop die het vult. Nooit alleen "geen resultaten": dat vertelt
 * een docent niet wat hij nu moet doen.
 */
export function EmptyState({ tekst, actie }: { tekst: string; actie?: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-lijn px-6 py-10 text-center">
      <p className="mx-auto max-w-[60ch] text-base text-tekst-zacht">{tekst}</p>
      {actie && <div className="mt-5 flex justify-center">{actie}</div>}
    </div>
  );
}
