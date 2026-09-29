import type { Criterium, Leerling, Niveau, Rubric } from "./types";
import { puntenVoor } from "./rubric";
export function maakFeedback(rubric: Rubric, leerling: Leerling): string {
  const gekozen = rubric.criteria
    .map((criterium) => ({ criterium, niveau: leerling.keuzes[criterium.id] }))
    .filter((item): item is { criterium: Criterium; niveau: Niveau } =>
      Boolean(item.niveau),
    );
  const goed = gekozen.filter(({ niveau }) => niveau >= 3);
  const beter = gekozen.filter(({ niveau }) => niveau <= 2);
  const laagste = [...gekozen].sort((a, b) => a.niveau - b.niveau)[0];
  const regels = [
    "Feed up",
    `Je doel was: ${rubric.titel}.`,
    "",
    "Feed back",
    goed.length
      ? `Wat goed ging: ${goed.map(({ criterium }) => criterium.sterkZin).join(" ")}`
      : "Wat goed ging: je hebt de opdracht aangepakt.",
    beter.length
      ? `Wat beter kan: ${beter.map(({ criterium }) => criterium.groeiZin).join(" ")}`
      : "Wat beter kan: kijk nog eens naar een detail dat je wilt aanscherpen.",
    leerling.notitie.trim() ? `Jouw notitie: ${leerling.notitie.trim()}` : "",
    "",
    "Feed forward",
    `Volgende stap: ${laagste?.criterium.volgendeStap ?? "Controleer je werk met de succescriteria."}`,
  ];
  return regels.filter((regel, index) => regel || regels[index - 1]).join("\n");
}

export function klasSignalen(rubric: Rubric, leerlingen: Leerling[]) {
  return rubric.criteria.map((criterium) => {
    const onvoldoende = leerlingen.filter(
      (leerling) => leerling.keuzes[criterium.id] === 1,
    ).length;
    const percentageOnvoldoende = leerlingen.length
      ? Math.round((onvoldoende / leerlingen.length) * 100)
      : 0;
    return {
      criterium: criterium.naam,
      percentageOnvoldoende,
      melding:
        percentageOnvoldoende >= 60
          ? `Klas-signaal: criterium ${criterium.naam} scoort bij ${percentageOnvoldoende}% onvoldoende, overweeg herhaling.`
          : null,
    };
  });
}

export function totaalPunten(rubric: Rubric, leerling: Leerling) {
  return rubric.criteria.reduce(
    (sum, criterium) =>
      sum +
      (leerling.keuzes[criterium.id]
        ? puntenVoor(criterium, leerling.keuzes[criterium.id])
        : 0),
    0,
  );
}
