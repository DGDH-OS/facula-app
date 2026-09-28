/**
 * Het ruwe, nog niet gevalideerde resultaat van een LLM-aanroep. Bewust een
 * eigen vorm en niet direct GeneratedLesson: een model mag nooit rechtstreeks
 * de vorm bepalen die de PPTX-/DOCX-export in gaat. src/lib/ai/map.ts zet dit
 * pas om nadat het door de validatie is, zodat een half antwoord nooit als
 * les in de database belandt.
 */

export interface AiLessonSectionDraft {
  /** Slide-regels, kort. Gaat na validatie door afdwingenSlideRegels. */
  inhoud: string[];
  /** Minuten voor deze sectie. */
  duur: number;
  /**
   * Toelichting die alleen de docent ziet en die dus NIET door de harde
   * slide-woordlimieten hoeft: volledige vraag-met-antwoord bij de check for
   * understanding, de cijfers achter de casus, de uitwerking van het
   * voorbeeld. Staat los van `inhoud` omdat beide exportroutes `inhoud`
   * afkappen tot 7 woorden per bullet (PRESENTATIE-METHODIEK.md) en een
   * complete vraag daar nooit in past.
   */
  docentnotities?: string[];
}

export interface AiLessonPartDraft {
  titel: string;
  leerdoelen: string[];
  secties: AiLessonSectionDraft[];
}

export interface AiLessonDraft {
  titel: string;
  kernbegrippen: string[];
  leerdoelen: string[];
  lessen: AiLessonPartDraft[];
}
