type StatusTone = "success" | "warning" | "neutral";

/**
 * Elk vlak/tekst-paar haalt >= 7:1, gemeten en vastgelegd in globals.css.
 * De oude varianten gebruikten goud en groen als tekstkleur op een 10-15%
 * tint van zichzelf; goud haalde daar 2,65:1.
 */
const TONE_STYLES: Record<StatusTone, string> = {
  success: "bg-succes-vlak text-succes-tekst",
  warning: "bg-waarschuwing-vlak text-waarschuwing-tekst",
  neutral: "bg-neutraal-vlak text-tekst",
};

/** Teken naast het label, zodat de betekenis niet alleen uit kleur komt. */
const TONE_TEKENS: Record<StatusTone, string> = {
  success: "✓",
  warning: "⚠",
  neutral: "•",
};

/**
 * Eén status-component voor de hele suite.
 *
 * `uitleg` stond eerder alleen in `title`. Een tooltip bestaat niet op
 * touch, komt niet mee in een schermlezer-scan van de pagina en verdwijnt
 * bij zoomen, dus de betekenis mocht daar niet als enige wonen. Nu geldt:
 * het label zelf zegt al wat het is ("AVG-gevoelig", niet "AVG"), en
 * `uitleg` staat als echte tekst in de badge, visueel verborgen voor wie
 * de kleur en het label al ziet maar voorgelezen voor wie dat niet doet.
 * `title` blijft erbij als extra voor de muisgebruiker, nooit als enige.
 */
export function StatusBadge({
  label,
  tone,
  uitleg,
}: {
  label: string;
  tone: StatusTone;
  uitleg?: string;
}) {
  return (
    <span
      title={uitleg}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${TONE_STYLES[tone]}`}
    >
      <span aria-hidden>{TONE_TEKENS[tone]}</span>
      {label}
      {uitleg && <span className="sr-only">. {uitleg}</span>}
    </span>
  );
}
