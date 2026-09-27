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
 * Eén status-component voor de hele suite. `title` geeft de volledige
 * uitleg als tooltip; omdat een tooltip op touch niet bestaat, staat de
 * uitleg altijd óók ergens als gewone tekst op de pagina.
 */
export function StatusBadge({
  label,
  tone,
  title,
}: {
  label: string;
  tone: StatusTone;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${TONE_STYLES[tone]}`}
    >
      <span aria-hidden>{TONE_TEKENS[tone]}</span>
      {label}
    </span>
  );
}
