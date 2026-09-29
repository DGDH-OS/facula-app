import type { ReactNode } from "react";

/**
 * De twee meldingen die overal in de app terugkwamen, nu als component.
 *
 * Ze stonden op zeven plekken als los kaderblok met dezelfde klassen en net
 * andere tekst eronder. Dat is precies het soort verschil dat een docent laat
 * twijfelen of hij hetzelfde scherm ziet als vorige week.
 *
 * Toon en ARIA horen bij elkaar en staan daarom hier vast: een fout is een
 * `role="alert"` (onderbreekt, want er moet iets gebeuren), een gelukte actie
 * is `aria-live="polite"` (wacht tot de gebruiker uitgepraat is).
 */
export function ErrorNotice({
  melding,
  uitleg,
  actie,
}: {
  melding: string;
  uitleg?: string;
  /** Meestal een knop die het opnieuw probeert. */
  actie?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-fout-tekst bg-fout-vlak px-5 py-4"
    >
      <p className="max-w-[70ch] text-base font-medium text-fout-tekst">{melding}</p>
      {uitleg && <p className="mt-1 max-w-[70ch] text-base text-tekst">{uitleg}</p>}
      {actie && <div className="mt-3">{actie}</div>}
    </div>
  );
}

/**
 * Een gelukte actie, in beeld tot de volgende paginawissel. Bewust geen toast
 * die na vier seconden wegschuift: die is weg voordat de doelgroep hem gelezen
 * heeft. Waar de actie terug te draaien is, hoort InlineUndo ernaast.
 */
export function SuccessNotice({
  melding,
  actie,
}: {
  melding: string;
  actie?: ReactNode;
}) {
  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-3 rounded-xl border-2 border-succes-tekst bg-succes-vlak px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2 max-w-[70ch] text-base font-medium text-succes-tekst">
        <span aria-hidden>✓</span>
        <span>{melding}</span>
      </p>
      {actie && <div className="shrink-0">{actie}</div>}
    </div>
  );
}
