import assert from "node:assert/strict";
import {
  berekenCijfer,
  nieuwCriterium,
  valideerRubric,
  valideerInitialen,
} from "../src/lib/nakijken/rubric";
import type { Leerling, Niveau } from "../src/lib/nakijken/types";
import { klasSignalen, maakFeedback, totaalPunten } from "../src/lib/nakijken/feedback";
import { controleerNakijkenPrivacy } from "../src/lib/report-quality";
const c = nieuwCriterium("Inhoud");
const rubric = {
  titel: "Betoog",
  criteria: [c, nieuwCriterium("Opbouw")],
  maxPunten: 8,
  cesuur: 55,
};
assert.equal(valideerRubric(rubric).length, 0);
assert.equal(berekenCijfer(4, 8, 55), 5.1);
assert.equal(berekenCijfer(0, 40, 55), 1);
assert.equal(berekenCijfer(22, 40, 55), 5.5);
assert.equal(berekenCijfer(31, 40, 55), 7.8);
assert.equal(berekenCijfer(40, 40, 55), 10);
assert.equal(berekenCijfer(1, 4, 0), null);
assert.equal(berekenCijfer(1, 4, 100), null);
assert.ok(valideerRubric({ ...rubric, maxPunten: 0 }).length > 0);
assert.ok(valideerRubric({ ...rubric, cesuur: 0 }).length > 0);
assert.ok(valideerRubric({ ...rubric, cesuur: 100 }).length > 0);
assert.equal(valideerInitialen("L.J."), true);
assert.equal(valideerInitialen("te-lang"), false);
assert.equal(valideerInitialen("Jan Jansen"), false);
const leerlingen: Leerling[] = [
  { id: "1", initialen: "L.J.", keuzes: { [c.id]: 1 as Niveau }, notitie: "" },
  { id: "2", initialen: "M.K.", keuzes: { [c.id]: 1 as Niveau }, notitie: "" },
  { id: "3", initialen: "S.R.", keuzes: { [c.id]: 3 as Niveau }, notitie: "" },
];
assert.equal(klasSignalen(rubric, leerlingen)[0].percentageOnvoldoende, 67);
assert.match(maakFeedback(rubric, leerlingen[0]), /Feed up/);
const stale = { ...leerlingen[0], keuzes: { [c.id]: 4 as Niveau, verwijderd: 2 as Niveau } };
assert.doesNotThrow(() => maakFeedback({ ...rubric, criteria: [{ ...c, niveaus: c.niveaus.slice(0, 3) }] }, stale));
assert.doesNotThrow(() => klasSignalen(rubric, [stale]));
assert.doesNotThrow(() => totaalPunten(rubric, stale));
assert.equal(
  controleerNakijkenPrivacy("diagnose en test@example.com").blokkeer,
  true,
);
assert.equal(
  controleerNakijkenPrivacy("Jan Jansen").waarschuwingVolledigeNaam,
  true,
);
console.log("nakijk-tests: ok");
