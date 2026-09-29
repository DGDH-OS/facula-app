import { AI_MELDING } from "@/lib/ai-transparantie";

/**
 * De zichtbare AI-vermelding bij een gegenereerd resultaat (AI-verordening
 * art. 50). Staat bovenaan elk resultaatscherm, niet onderaan: wie de les
 * doorleest hoort vóóraf te weten dat er nog een controle bij hoort.
 *
 * Bewust geen StatusBadge: dit is geen status van het item maar een
 * mededeling over de herkomst, en hij moet leesbaar blijven op 320px. Het
 * waarschuwing-paar haalt 10,43:1 (zie globals.css), dus ook op een beamer
 * en voor een docent van 60+ is dit te lezen.
 *
 * `variant="regel"` is de compacte vorm voor een plek waar al een kader om
 * heen staat, bijvoorbeeld onder de knoppen van een exportscherm.
 */
export function AiMelding({ variant = "vlak" }: { variant?: "vlak" | "regel" }) {
  if (variant === "regel") {
    return (
      <p className="flex items-start gap-2 text-base text-tekst-zacht">
        <span aria-hidden>ⓘ</span>
        <span>{AI_MELDING}</span>
      </p>
    );
  }

  return (
    <p className="flex items-start gap-2 rounded-xl bg-waarschuwing-vlak px-4 py-3 text-base font-semibold text-waarschuwing-tekst">
      <span aria-hidden>ⓘ</span>
      <span>{AI_MELDING}</span>
    </p>
  );
}
