import type {
  GeneratedLesson,
  LessonInput,
  LessonPart,
  LessonSection,
} from "../types";
import {
  afdwingenSlideRegels,
  trimTitel,
  MAX_WOORDEN_PER_DEFINITIE_BULLET,
} from "../slide-content-rules";
import { bouwLeerdoelKernbegrippen } from "../lesson-generator";
import {
  AANTAL_SECTIES,
  LAATSTE_HUISWERK_TITEL,
  MAX_LEERDOELEN,
  SECTIE_TITELS,
} from "./prompt";
import { schoneRegels, schoonKernbegrip, schoonRegel } from "./sanitize";
import type { AiLessonDraft } from "./types";

/** Index van de sectie "2. Leerdoel & kernbegrippen" binnen SECTIE_TITELS. */
const INDEX_KERNBEGRIPPEN = 1;
/** Maximale afwijking tussen de som van de sectieduren en de lesduur. */
const MAX_DUUR_AFWIJKING = 5;

/**
 * Gegooid zodra modeloutput niet aan de vorm voldoet die de exports nodig
 * hebben. De aanroeper (src/app/api/lessons/route.ts) vangt dit op en gaat naar
 * het volgende model in de keten, of uiteindelijk naar de sjabloongenerator.
 * Een halve les wordt dus nooit opgeslagen.
 */
export class AiDraftOngeldig extends Error {
  constructor(reden: string) {
    super("Modeloutput ongeldig: " + reden);
    this.name = "AiDraftOngeldig";
  }
}

/**
 * Verdeelt de sectieduren zo dat ze precies op de lesduur uitkomen wanneer de
 * som er meer dan MAX_DUUR_AFWIJKING minuten naast zit. Proportioneel schalen,
 * want de verhouding tussen de secties is wel bruikbare informatie: het is de
 * totaaltijd die moet kloppen, niet de verdeling.
 */
function normaliseerDuren(duren: number[], lesduur: number): number[] {
  const veilig = duren.map((d) => (Number.isFinite(d) && d > 0 ? Math.round(d) : 0));
  const som = veilig.reduce((a, b) => a + b, 0);
  if (som === 0) {
    // Geen bruikbare verdeling gekregen: gelijk verdelen is beter dan nul.
    const basis = Math.floor(lesduur / veilig.length);
    const uit = veilig.map(() => basis);
    uit[0] += lesduur - basis * veilig.length;
    return uit;
  }
  if (Math.abs(som - lesduur) <= MAX_DUUR_AFWIJKING) return veilig;

  const geschaald = veilig.map((d) => Math.max(0, Math.round((d / som) * lesduur)));
  const verschil = lesduur - geschaald.reduce((a, b) => a + b, 0);
  if (verschil !== 0) {
    // Afrondingsrest op de langste sectie, zodat geen enkele sectie negatief
    // wordt door een correctie van een paar minuten.
    const langste = geschaald.indexOf(Math.max(...geschaald));
    geschaald[langste] = Math.max(0, geschaald[langste] + verschil);
  }
  return geschaald;
}

/**
 * De bullets van sectie 2 hebben de vorm "Begrip: uitleg" en mogen daarom
 * langer zijn dan een actie-bullet (zie MAX_WOORDEN_PER_DEFINITIE_BULLET in
 * slide-content-rules.ts). Komt er geen enkele definitie-regel terug, dan wordt
 * de sectie opgebouwd met exact dezelfde functie die de sjabloongenerator
 * gebruikt, zodat de kernbegrippendia nooit leeg is.
 */
function bouwKernbegrippenSectie(
  regels: string[],
  kernbegrippen: string[],
  input: LessonInput,
  isEersteLes: boolean
): string[] {
  const metDefinitie = regels.slice(1).filter((r) => r.includes(":"));
  if (metDefinitie.length === 0) {
    return bouwLeerdoelKernbegrippen(input.vak, kernbegrippen, isEersteLes);
  }
  const kop =
    regels[0] ?? (isEersteLes ? "Leerdoel van deze les" : "Herhaling en nieuwe begrippen");
  return afdwingenSlideRegels([kop, ...metDefinitie], {
    maxBullets: metDefinitie.length + 1,
    maxWoordenPerBullet: MAX_WOORDEN_PER_DEFINITIE_BULLET,
    maxTotaalWoorden: (metDefinitie.length + 1) * MAX_WOORDEN_PER_DEFINITIE_BULLET,
  });
}

function sectieTitel(index: number, isLaatsteLes: boolean): string {
  const laatsteSectie = index === AANTAL_SECTIES - 1;
  return trimTitel(
    laatsteSectie && isLaatsteLes ? LAATSTE_HUISWERK_TITEL : SECTIE_TITELS[index]
  );
}

/**
 * Zet een AiLessonDraft om naar een GeneratedLesson met exact de vorm die
 * pptx-export.ts en pptx-export-mihiriban-style.ts verwachten: acht secties per
 * lesdeel, in vaste volgorde, met de sectietitels uit de code.
 *
 * Gooit AiDraftOngeldig zodra de draft die vorm niet kan vullen.
 */
export function mapDraftNaarLes(
  draft: AiLessonDraft,
  input: LessonInput,
  model: string
): GeneratedLesson {
  const titel = trimTitel(schoonRegel(draft?.titel, 120));
  if (!titel) throw new AiDraftOngeldig("geen titel");

  const kernbegrippen = Array.isArray(draft?.kernbegrippen)
    ? Array.from(new Set(draft.kernbegrippen.map(schoonKernbegrip).filter(Boolean)))
    : [];
  if (kernbegrippen.length < 2) throw new AiDraftOngeldig("minder dan 2 kernbegrippen");

  const leerdoelen = schoneRegels(draft?.leerdoelen, 300).slice(0, MAX_LEERDOELEN);
  if (leerdoelen.length === 0) throw new AiDraftOngeldig("geen leerdoelen");

  const lessen = Array.isArray(draft?.lessen) ? draft.lessen : [];
  if (lessen.length !== input.aantalLessen) {
    throw new AiDraftOngeldig(
      lessen.length + " lesdelen in plaats van " + input.aantalLessen
    );
  }

  const aantalLessen = lessen.length;
  const onderdelen: LessonPart[] = lessen.map((les, lesIndex) => {
    const isEersteLes = lesIndex === 0;
    const isLaatsteLes = lesIndex === aantalLessen - 1;

    const secties = Array.isArray(les?.secties) ? les.secties : [];
    if (secties.length !== AANTAL_SECTIES) {
      throw new AiDraftOngeldig(
        "lesdeel " + (lesIndex + 1) + " heeft " + secties.length + " secties, " +
          "verwacht " + AANTAL_SECTIES
      );
    }

    const lesLeerdoelen = schoneRegels(les?.leerdoelen, 300).slice(0, 3);

    const ruweInhoud = secties.map((sectie, sectieIndex) => {
      const regels = schoneRegels(sectie?.inhoud);
      if (regels.length === 0) {
        throw new AiDraftOngeldig(
          "lesdeel " + (lesIndex + 1) + " sectie " + (sectieIndex + 1) + " is leeg"
        );
      }
      return regels;
    });

    const duren = normaliseerDuren(
      secties.map((sectie) => Number(sectie?.duur)),
      input.lesduur
    );

    const uitSecties: LessonSection[] = ruweInhoud.map((regels, sectieIndex) => {
      const inhoud =
        sectieIndex === INDEX_KERNBEGRIPPEN
          ? bouwKernbegrippenSectie(regels, kernbegrippen, input, isEersteLes)
          : afdwingenSlideRegels(regels);

      const docentnotities = schoneRegels(secties[sectieIndex]?.docentnotities, 600);

      return {
        titel: sectieTitel(sectieIndex, isLaatsteLes),
        duur: duren[sectieIndex],
        inhoud,
        ...(docentnotities.length > 0 ? { docentnotities } : {}),
      };
    });

    const deelTitel = schoonRegel(les?.titel, 120);
    return {
      nummer: lesIndex + 1,
      titel: trimTitel(
        "Les " + (lesIndex + 1) + " van " + aantalLessen + (deelTitel ? ": " + deelTitel : "")
      ),
      duur: input.lesduur,
      secties: uitSecties,
      ...(lesLeerdoelen.length > 0 ? { leerdoelen: lesLeerdoelen } : {}),
    };
  });

  return {
    id: "les-" + Date.now(),
    createdAt: new Date().toISOString(),
    input,
    titel,
    kernbegrippen,
    onderdelen,
    leerdoelen,
    bron: "ai",
    model,
  };
}
