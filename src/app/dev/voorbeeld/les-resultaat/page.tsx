import Link from "next/link";
import { AiMelding } from "@/components/ui/AiMelding";
import { Button } from "@/components/ui/Button";
import { LessonSections } from "@/components/lessons/LessonSections";
import { VOORBEELD_LES } from "@/lib/dev/voorbeeldgegevens";

/**
 * Een lokaal resultaat met verzonnen lesinhoud. Downloaden en bewerken zijn
 * hier bewust niet gekoppeld: dit scherm is uitsluitend voor visuele controle.
 */
export default function VoorbeeldLesResultaat() {
  const les = VOORBEELD_LES;

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="max-w-[70ch] font-display text-3xl text-marine">{les.titel}</h1>
        <p className="mt-2 text-base text-tekst-zacht">
          {les.input.vak} · {les.input.niveau} {les.input.leerjaar}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {les.kernbegrippen.map((begrip) => (
            <span
              key={begrip}
              className="rounded-full bg-neutraal-vlak px-3 py-1 text-base font-semibold text-tekst"
            >
              {begrip}
            </span>
          ))}
        </div>
        <div className="mt-6">
          <AiMelding />
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t-2 border-lijn pt-6 sm:flex-row sm:flex-wrap sm:items-start">
          <Button variant="primary">Download als PowerPoint</Button>
          <Button variant="secondary">Pas aan</Button>
          <Button variant="secondary">Maak opnieuw</Button>
        </div>
        <p className="mt-4 text-base text-tekst">
          <Link
            href="/dev/voorbeeld/les-nieuw"
            className="font-semibold text-marine underline underline-offset-4"
          >
            Maak een nieuwe les
          </Link>{" "}
          met een ander leerdoel.
        </p>
      </header>
      <LessonSections lessonId={les.id} onderdelen={les.onderdelen} />
    </div>
  );
}
