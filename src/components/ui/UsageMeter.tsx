/**
 * Hoeveel er deze maand nog kan, in gewone woorden plus een balk.
 *
 * De balk is decoratief en dus aria-hidden: de regel eronder zegt hetzelfde in
 * tekst ("Nog 3 van de 5 deze maand"). Betekenis nooit alleen uit een kleur of
 * een lengte, want dan mist een deel van de doelgroep hem.
 *
 * `limiet === null` betekent: geen maandlimiet (abonnee of schoollicentie
 * zonder plafond). Dan staat er een regel en geen balk, want een balk zonder
 * eindpunt zegt niets.
 */
export function UsageMeter({
  label,
  gebruikt,
  limiet,
}: {
  label: string;
  gebruikt: number;
  limiet: number | null;
}) {
  if (limiet === null) {
    return (
      <div>
        <p className="text-base font-semibold text-marine">{label}</p>
        <p className="mt-1 text-base text-tekst-zacht">
          Geen maandlimiet. Je maakte er {gebruikt} deze maand.
        </p>
      </div>
    );
  }

  const over = Math.max(limiet - gebruikt, 0);
  const deel = limiet > 0 ? Math.min(gebruikt / limiet, 1) : 1;
  const vol = over === 0;
  const breedte = Math.round(deel * 100) + "%";

  return (
    <div>
      <p className="text-base font-semibold text-marine">{label}</p>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-lijn" aria-hidden>
        <div
          className={vol ? "h-full rounded-full bg-fout-tekst" : "h-full rounded-full bg-marine"}
          style={{ width: breedte }}
        />
      </div>
      <p className="mt-2 text-base text-tekst-zacht">
        {vol
          ? "Je limiet van " + limiet + " is bereikt. Volgende maand kun je weer verder."
          : "Nog " + over + " van de " + limiet + " deze maand."}
      </p>
    </div>
  );
}
