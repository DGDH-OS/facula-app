type StatusTone = "success" | "warning" | "neutral";

const TONE_STYLES: Record<StatusTone, string> = {
  success: "bg-[var(--color-groen)]/10 text-[var(--color-groen)]",
  warning: "bg-[var(--color-goud)]/15 text-[var(--color-goud)]",
  neutral: "bg-[var(--color-inkt)]/10 text-[var(--color-inkt)]/70",
};

/**
 * Eén status-component voor de hele suite: kleur + stip i.p.v. een
 * tekstuele uitleg. `title` geeft de volledige uitleg als tooltip,
 * zodat het zichtbare label kort kan blijven.
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_STYLES[tone]}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}
