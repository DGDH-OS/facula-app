/**
 * De AI-vermelding, op één plek.
 *
 * De AI-verordening (EU 2024/1689) vraagt in artikel 50 dat iemand die met
 * AI gegenereerde inhoud onder ogen krijgt, dat kan weten. Een les of toets
 * belandt bij leerlingen en ouders, dus de vermelding hoort niet alleen in de
 * app te staan maar ook in het bestand dat de deur uit gaat.
 *
 * Eén constante voor beide, zodat het scherm en de download nooit iets anders
 * beloven. De tekst is bewust een mededeling plus een opdracht: de docent
 * blijft verantwoordelijk voor wat er in de klas komt, en dat is precies wat
 * de verordening van een gebruiker verwacht.
 */

/** Wat op het scherm staat bij elk gegenereerd resultaat. */
export const AI_MELDING = "Gemaakt met AI. Controleer altijd voor gebruik.";

/**
 * Dezelfde mededeling in een export. Iets uitgebreider, omdat een bestand
 * losraakt van de app: wie het over een half jaar opent, weet dan nog waar het
 * vandaan komt.
 */
export const AI_MELDING_EXPORT =
  "Gemaakt met AI via Facula. Controleer altijd voor gebruik.";
