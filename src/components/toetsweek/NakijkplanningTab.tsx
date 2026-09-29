import { ErrorNotice } from "@/components/ui/Notice";
import { dagnaam, isoWeekLabel } from "@/lib/toetsweek/planner";
import type { NakijkplanningResultaat } from "@/lib/toetsweek/planner";
import type { ToetsItem } from "@/lib/toetsweek/types";

export function NakijkplanningTab({
  items,
  nakijkplanning,
}: {
  items: ToetsItem[];
  nakijkplanning: NakijkplanningResultaat;
}) {
  const bijId = new Map(items.map((item) => [item.id, item]));
  const { dagen, tekorten, totaalPerWeek } = nakijkplanning;

  return (
    <section className="space-y-6">
      {tekorten.length > 0 && (
        <div className="space-y-3">
          {tekorten.map((tekort) => (
            <ErrorNotice key={tekort.toetsId} melding={tekort.melding} />
          ))}
        </div>
      )}
      {dagen.length === 0 ? (
        <p className="text-base text-tekst-zacht">
          Nog niets om na te kijken. Vul een toets in met het aantal leerlingen.
        </p>
      ) : (
        <div className="space-y-4">
          {dagen.map((dag) => (
            <article
              key={dag.datum}
              className="rounded-xl border-2 border-lijn bg-ivoor p-5"
            >
              <h2 className="font-display text-xl text-marine">{dagnaam(dag.datum)}</h2>
              <ul className="mt-3 space-y-2">
                {dag.toewijzingen.map((toewijzing, index) => {
                  const item = bijId.get(toewijzing.toetsId);
                  return (
                    <li key={`${toewijzing.toetsId}-${index}`} className="text-base">
                      {item ? `${item.klas} ${item.vak}` : "onbekende toets"}:{" "}
                      {toewijzing.minuten} minuten, ongeveer {toewijzing.ongeveerLeerlingen}{" "}
                      leerlingen
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      )}
      {totaalPerWeek.length > 0 && (
        <div className="overflow-x-auto rounded-xl border-2 border-lijn bg-neutraal-vlak">
          <table className="w-full min-w-[24rem] text-left text-base">
            <caption className="p-5 text-left font-display text-2xl text-marine">
              Docentbelasting per week
            </caption>
            <thead>
              <tr className="border-t-2 border-lijn">
                <th scope="col" className="p-3 font-semibold">
                  Week
                </th>
                <th scope="col" className="p-3 font-semibold">
                  Geplande nakijkminuten
                </th>
              </tr>
            </thead>
            <tbody>
              {totaalPerWeek.map((week) => (
                <tr key={`${week.jaar}-${week.week}`} className="border-t border-lijn">
                  <th scope="row" className="p-3 font-semibold">
                    {isoWeekLabel(week)}
                  </th>
                  <td className="p-3">{week.minuten} minuten</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
