"use client";
import { Button } from "@/components/ui/Button";
import { klasSignalen } from "@/lib/nakijken/feedback";
import type { Leerling, Rubric } from "@/lib/nakijken";
export function KlasOverzicht({
  rubric,
  leerlingen,
  signalen,
  exporteer,
  exporteerWord,
  wisAlles,
}: {
  rubric: Rubric;
  leerlingen: Leerling[];
  signalen: ReturnType<typeof klasSignalen>;
  exporteer: () => Promise<void>;
  exporteerWord: () => Promise<void>;
  wisAlles: () => void;
}) {
  return (
    <section className="space-y-6">
      <div className="overflow-x-auto rounded-xl border-2 border-lijn bg-ivoor">
        <table className="w-full min-w-[42rem] text-left text-base">
          <caption className="p-5 text-left font-display text-2xl text-marine">
            Klas-overzicht
          </caption>
          <thead>
            <tr className="border-t-2 border-lijn">
              <th className="p-3 font-semibold">Initialen</th>
              {rubric.criteria.map((criterium) => (
                <th key={criterium.id} className="p-3 font-semibold">
                  {criterium.naam}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leerlingen.map((leerling) => (
              <tr key={leerling.id} className="border-t border-lijn">
                <th className="p-3">{leerling.initialen}</th>
                {rubric.criteria.map((criterium) => (
                  <td key={criterium.id} className="p-3">
                    {leerling.keuzes[criterium.id] ?? "–"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {signalen.map((signaal) => (
          <div
            key={signaal.criterium}
            className={`rounded-xl border-2 p-4 ${signaal.melding ? "border-waarschuwing-tekst bg-waarschuwing-vlak" : "border-lijn"}`}
          >
            <p className="text-base font-semibold text-marine">
              {signaal.criterium}: {signaal.percentageOnvoldoende}% onvoldoende
            </p>
            {signaal.melding && (
              <p className="mt-1 text-base" aria-live="polite">
                {signaal.melding}
              </p>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={exporteer}>Kopieer alles</Button>
        <Button onClick={exporteerWord} disabled={!leerlingen.length}>
          Download als Word
        </Button>
        <Button onClick={wisAlles}>Wis alles</Button>
      </div>
    </section>
  );
}
