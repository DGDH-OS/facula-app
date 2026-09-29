import assert from "node:assert/strict";
import {
  berekenCijfer,
  nieuwCriterium,
  valideerRubric,
} from "../src/lib/nakijken/rubric";
import type { Leerling, Niveau } from "../src/lib/nakijken/types";
import { klasSignalen, maakFeedback } from "../src/lib/nakijken/feedback";
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
const leerlingen: Leerling[] = [
  { id: "1", initialen: "L.J.", keuzes: { [c.id]: 1 as Niveau }, notitie: "" },
  { id: "2", initialen: "M.K.", keuzes: { [c.id]: 1 as Niveau }, notitie: "" },
  { id: "3", initialen: "S.R.", keuzes: { [c.id]: 3 as Niveau }, notitie: "" },
];
assert.equal(klasSignalen(rubric, leerlingen)[0].percentageOnvoldoende, 67);
assert.match(maakFeedback(rubric, leerlingen[0]), /Feed up/);
assert.equal(
  controleerNakijkenPrivacy("diagnose en test@example.com").blokkeer,
  true,
);
assert.equal(
  controleerNakijkenPrivacy("Jan Jansen").waarschuwingVolledigeNaam,
  true,
);
console.log("nakijk-tests: ok");
