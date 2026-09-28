import Link from "next/link";

/**
 * Voortgang in woorden ("Stap 2 van 3") plus een terug-actie linksboven.
 * Geen bolletjes-zonder-tekst: de stand moet ook zonder kleurwaarneming
 * te lezen zijn. De balk eronder is decoratief en dus aria-hidden.
 *
 * `terug` is óf een href (eerste stap: terug naar het startscherm) óf een
 * functie (verder in de flow: een stap terug binnen dezelfde pagina).
 *
 * De kop heeft `tabIndex={-1}` en kan via `kopRef` focus krijgen: dat is
 * het terugvalpunt als een stapwissel geen veld heeft om naartoe te
 * springen. Met -1 blijft hij buiten de Tab-volgorde.
 */
export function Stepper({
  stap,
  totaal,
  titel,
  terug,
  terugLabel = "Terug",
  kopRef,
}: {
  stap: number;
  totaal: number;
  titel: string;
  terug: string | (() => void);
  terugLabel?: string;
  kopRef?: React.Ref<HTMLHeadingElement>;
}) {
  const percentage = Math.round((stap / totaal) * 100);

  return (
    <div>
      {typeof terug === "string" ? (
        <Link
          href={terug}
          className="inline-flex min-h-14 items-center gap-2 text-base font-medium text-marine underline underline-offset-4"
        >
          <span aria-hidden>←</span>
          {terugLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={terug}
          className="inline-flex min-h-14 items-center gap-2 text-base font-medium text-marine underline underline-offset-4"
        >
          <span aria-hidden>←</span>
          {terugLabel}
        </button>
      )}

      <p className="mt-2 text-base font-semibold text-tekst-zacht">
        Stap {stap} van {totaal}
      </p>
      <h1 ref={kopRef} tabIndex={-1} className="mt-1 font-display text-3xl text-marine">
        {titel}
      </h1>

      <div
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-lijn"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-marine transition-all duration-200"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
