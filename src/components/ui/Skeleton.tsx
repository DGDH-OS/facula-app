/**
 * Wat er staat terwijl een serverpagina nog aan het laden is.
 *
 * Bewust vormen zonder tekst en zonder pulserende animatie: een blok dat
 * knippert leest als iets dat stuk is, en de reduced-motion-regel in
 * globals.css zou de animatie voor een deel van de doelgroep toch uitzetten.
 * De vlakken staan op de plek waar straks de echte inhoud komt, zodat de
 * pagina niet verspringt zodra die er is.
 *
 * De losse regel met `role="status"` vertelt een schermlezer wat er gebeurt;
 * de vlakken zelf zijn decoratief.
 */
export function PageSkeleton({ regels = 3 }: { regels?: number }) {
  return (
    <div>
      <p role="status" className="sr-only">
        De pagina wordt geladen.
      </p>
      <div className="h-9 w-2/3 max-w-sm rounded-lg bg-neutraal-vlak" aria-hidden />
      <div className="mt-4 h-6 w-full max-w-xl rounded-lg bg-neutraal-vlak" aria-hidden />
      <div className="mt-10 space-y-4" aria-hidden>
        {Array.from({ length: regels }).map((_, i) => (
          <div key={i} className="h-24 w-full rounded-2xl border-2 border-lijn bg-ivoor-deep" />
        ))}
      </div>
    </div>
  );
}
