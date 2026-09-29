import type { Criterium, Niveau, Rubric, RubricLevel } from "./types";
type StarterCriterium = {
  naam: string;
  descriptoren: [string, string, string, string];
  sterkZin: string;
  groeiZin: string;
  volgendeStap: string;
};
type Starter = { titel: string; criteria: StarterCriterium[] };

const s = (
  naam: string,
  descriptoren: [string, string, string, string],
  sterkZin: string,
  groeiZin: string,
  volgendeStap: string,
): StarterCriterium => ({
  naam,
  descriptoren,
  sterkZin,
  groeiZin,
  volgendeStap,
});

export const STARTERS: Record<string, Starter> = {
  "Betoog schrijven": {
    titel: "Betoog schrijven",
    criteria: [
      s(
        "Standpunt en argumenten",
        [
          "Een standpunt ontbreekt of is niet duidelijk.",
          "Je standpunt is herkenbaar, maar argumenten zijn nog kort of weinig uitgewerkt.",
          "Je standpunt is duidelijk en je argumenten ondersteunen het goed.",
          "Je standpunt is scherp en je argumenten zijn overtuigend uitgewerkt.",
        ],
        "Je standpunt en argumenten maken duidelijk wat je vindt.",
        "Je argumenten mogen nog sterker worden uitgelegd.",
        "Leg bij elk argument uit waarom dit jouw standpunt ondersteunt.",
      ),
      s(
        "Opbouw",
        [
          "Inleiding, kern en slot ontbreken of lopen door elkaar.",
          "Inleiding, kern en slot zijn aanwezig, maar de overgangen zijn niet altijd logisch.",
          "Inleiding, kern en slot zijn duidelijk; alinea's volgen logisch op elkaar.",
          "De tekst heeft een heldere lijn en bouwt overtuigend naar het slot toe.",
        ],
        "Je bouwt je betoog logisch op.",
        "De volgorde van enkele alinea's kan duidelijker.",
        "Schrijf boven elke alinea kort op wat de functie ervan is.",
      ),
      s(
        "Taal en brongebruik",
        [
          "Zinnen en bronnen zijn vaak onduidelijk of ontbreken.",
          "Je gebruikt enkele passende bronnen, maar verwijst er nog niet steeds duidelijk naar.",
          "Je schrijft begrijpelijke zinnen en verwerkt bronnen op een passende manier.",
          "Je taal is precies en je bronnen zijn zorgvuldig en controleerbaar verwerkt.",
        ],
        "Je taal en bronnen ondersteunen je boodschap.",
        "Controleer je formuleringen en bronverwijzingen nog een keer.",
        "Lees je tekst hardop en controleer per bron wat je precies gebruikt.",
      ),
    ],
  },
  Presentatie: {
    titel: "Presentatie",
    criteria: [
      s(
        "Inhoud",
        [
          "Belangrijke informatie ontbreekt of is niet juist.",
          "De kern is aanwezig, maar voorbeelden of uitleg ontbreken nog.",
          "Je legt de kern juist uit en gebruikt passende voorbeelden.",
          "Je uitleg is volledig, precies en afgestemd op je publiek.",
        ],
        "Je legt de belangrijkste informatie duidelijk uit.",
        "Werk je uitleg uit met een concreet voorbeeld.",
        "Kies één voorbeeld dat je kernboodschap zichtbaar maakt.",
      ),
      s(
        "Opbouw en uitleg",
        [
          "Je presentatie heeft geen duidelijke volgorde.",
          "Er is een begin en einde, maar de overgang tussen onderdelen is onduidelijk.",
          "Je presentatie heeft een duidelijke inleiding, kern en afsluiting.",
          "Je opbouw leidt het publiek soepel door het onderwerp.",
        ],
        "Je presentatie heeft een herkenbare opbouw.",
        "Maak de overgang tussen twee onderdelen duidelijker.",
        "Kondig elk nieuw onderdeel aan met één korte overgangszin.",
      ),
      s(
        "Presenteren",
        [
          "Je spreekt te zacht of leest bijna alles voor.",
          "Je bent soms verstaanbaar en kijkt af en toe op.",
          "Je spreekt verstaanbaar, kijkt je publiek aan en gebruikt je hulpmiddel goed.",
          "Je presenteert rustig en overtuigend en reageert goed op je publiek.",
        ],
        "Je contact met het publiek helpt je uitleg.",
        "Kijk vaker op van je aantekeningen.",
        "Markeer kernwoorden en oefen de presentatie zonder volledige zinnen.",
      ),
    ],
  },
  Werkstuk: {
    titel: "Werkstuk",
    criteria: [
      s(
        "Inhoud en onderzoek",
        [
          "De onderzoeksvraag of belangrijke informatie ontbreekt.",
          "Je beantwoordt de vraag deels met weinig onderbouwing.",
          "Je beantwoordt de onderzoeksvraag met relevante informatie.",
          "Je onderzoek is diepgaand en conclusies zijn goed onderbouwd.",
        ],
        "Je informatie past bij je onderzoeksvraag.",
        "Onderbouw een conclusie met een extra bron of voorbeeld.",
        "Noteer per deelvraag welke bron je antwoord ondersteunt.",
      ),
      s(
        "Structuur",
        [
          "Onderdelen staan door elkaar en kopjes ontbreken.",
          "De structuur is gedeeltelijk duidelijk, maar sommige delen passen niet goed.",
          "Kopjes en alinea's maken de opbouw overzichtelijk.",
          "De structuur is logisch, helder en prettig te volgen.",
        ],
        "Je werkstuk is overzichtelijk ingedeeld.",
        "Maak de relatie tussen twee onderdelen duidelijker.",
        "Controleer of elk kopje de vraag van die alinea beantwoordt.",
      ),
      s(
        "Verzorging",
        [
          "Bronnen, spelling en afbeeldingen zijn vaak niet verzorgd.",
          "De vormgeving is begrijpelijk, maar controle is nog nodig.",
          "Je werkstuk is netjes opgemaakt en bronnen zijn vermeld.",
          "Je werkstuk is zorgvuldig vormgegeven en foutarm afgewerkt.",
        ],
        "Je verzorging maakt je werkstuk prettig leesbaar.",
        "Plan nog een laatste controle op spelling en bronnen.",
        "Gebruik een vaste checklist voor je laatste controle.",
      ),
    ],
  },
  Samenwerkopdracht: {
    titel: "Samenwerkopdracht",
    criteria: [
      s(
        "Bijdrage",
        [
          "Je taak is niet uitgevoerd of blijft onduidelijk.",
          "Je voert een deel van je taak uit, maar hebt nog hulp nodig.",
          "Je voert je taak zelfstandig en op tijd uit.",
          "Je neemt verantwoordelijkheid en helpt het team vooruit.",
        ],
        "Je bijdrage helpt het team om verder te komen.",
        "Maak eerder duidelijk wat je nodig hebt om je taak af te ronden.",
        "Spreek aan het begin af wanneer je jouw deel laat zien.",
      ),
      s(
        "Overleggen",
        [
          "Je luistert weinig of afspraken worden niet nagekomen.",
          "Je deelt ideeën, maar vraagt nog weinig door.",
          "Je luistert, legt je ideeën uit en maakt duidelijke afspraken.",
          "Je verbindt ideeën en helpt het team zorgvuldig beslissen.",
        ],
        "Je overlegt duidelijk met je team.",
        "Vat een afspraak aan het einde kort samen.",
        "Sluit elk overleg af met wie-wat-wanneer.",
      ),
      s(
        "Resultaat",
        [
          "Het gezamenlijke resultaat is niet af of past niet bij de opdracht.",
          "Het resultaat is deels af, maar onderdelen sluiten niet goed aan.",
          "Het resultaat is compleet en past bij de opdracht.",
          "Het resultaat is samenhangend en laat extra zorg zien.",
        ],
        "Jullie resultaat laat zien dat jullie samenwerkten.",
        "Controleer samen of alle eisen zichtbaar zijn.",
        "Vergelijk het eindresultaat met de opdrachtcriteria.",
      ),
    ],
  },
  "Rekenopdracht met uitleg": {
    titel: "Rekenopdracht met uitleg",
    criteria: [
      s(
        "Rekenstappen",
        [
          "De gekozen bewerking of stappen zijn niet herkenbaar.",
          "Je kiest een passende aanpak, maar maakt nog een stapfout.",
          "Je noteert passende rekenstappen in de juiste volgorde.",
          "Je kiest efficiënt en legt elke stap foutloos vast.",
        ],
        "Je aanpak laat zien hoe je het probleem oplost.",
        "Controleer de stap waarin je een bewerking uitvoert.",
        "Schrijf bij elke tussenstap de gebruikte bewerking op.",
      ),
      s(
        "Uitleg",
        [
          "Je legt niet uit waarom je deze aanpak kiest.",
          "Je uitleg benoemt een deel van de aanpak, maar blijft kort.",
          "Je legt begrijpelijk uit waarom je deze aanpak gebruikt.",
          "Je uitleg is precies en maakt je redenering goed controleerbaar.",
        ],
        "Je uitleg maakt je rekenwerk begrijpelijk.",
        "Leg vooral uit waarom je de eerste stap kiest.",
        "Gebruik de woorden omdat, dus en daarom in je redenering.",
      ),
      s(
        "Antwoord controleren",
        [
          "Een antwoord of controle ontbreekt.",
          "Je geeft een antwoord, maar controleert de uitkomst nog niet.",
          "Je controleert of je antwoord logisch is en noteert de eenheid.",
          "Je controleert op meerdere manieren en licht je conclusie toe.",
        ],
        "Je controleert of je uitkomst past bij de vraag.",
        "Voeg een korte controle toe aan het einde.",
        "Schat eerst de uitkomst en vergelijk die daarna met je antwoord.",
      ),
    ],
  },
  "Practicum verslag": {
    titel: "Practicum verslag",
    criteria: [
      s(
        "Werkwijze",
        [
          "De stappen van het practicum zijn niet beschreven.",
          "Je beschrijft enkele stappen, maar een ander kan het practicum niet herhalen.",
          "Je beschrijft de werkwijze stap voor stap en noemt de materialen.",
          "Je werkwijze is precies genoeg om het onderzoek betrouwbaar te herhalen.",
        ],
        "Je werkwijze maakt duidelijk wat je hebt gedaan.",
        "Noem ook het materiaal of de volgorde die nog ontbreekt.",
        "Lees je werkwijze na alsof iemand anders het practicum uitvoert.",
      ),
      s(
        "Waarnemingen",
        [
          "Waarnemingen ontbreken of zijn vooral meningen.",
          "Je noteert enkele waarnemingen, maar meetgegevens zijn niet compleet.",
          "Je noteert meetgegevens en waarnemingen nauwkeurig.",
          "Je ordent gegevens overzichtelijk en benoemt opvallende patronen.",
        ],
        "Je waarnemingen zijn concreet en controleerbaar.",
        "Noteer een meetwaarde of zichtbaar kenmerk bij elke waarneming.",
        "Zet je metingen in een tabel met eenheid en tijdstip.",
      ),
      s(
        "Conclusie",
        [
          "Een conclusie ontbreekt of beantwoordt de onderzoeksvraag niet.",
          "Je conclusie past deels bij de waarnemingen, maar uitleg ontbreekt.",
          "Je conclusie beantwoordt de onderzoeksvraag met verwijzing naar gegevens.",
          "Je conclusie is scherp en bespreekt ook een beperking van het onderzoek.",
        ],
        "Je conclusie sluit aan bij je waarnemingen.",
        "Verwijs in je conclusie naar een concrete meetwaarde.",
        "Begin je conclusie met het antwoord en onderbouw dit daarna met twee gegevens.",
      ),
    ],
  },
};

export const DEFAULT_LEVELS: RubricLevel[] = [
  {
    label: "Onvoldoende",
    descriptor: "Je laat dit onderdeel nog niet zien.",
    punten: 1,
  },
  {
    label: "Voldoende",
    descriptor: "Je laat dit onderdeel deels zien, soms met hulp.",
    punten: 2,
  },
  {
    label: "Goed",
    descriptor: "Je laat dit onderdeel duidelijk en meestal zelfstandig zien.",
    punten: 3,
  },
  {
    label: "Uitstekend",
    descriptor: "Je laat dit onderdeel helder, zelfstandig en sterk zien.",
    punten: 4,
  },
];

export function nieuwCriterium(
  naam = "Nieuw criterium",
  starter?: StarterCriterium,
): Criterium {
  return {
    id: `criterium-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    naam,
    niveaus: starter
      ? starter.descriptoren.map((descriptor, index) => ({
          ...DEFAULT_LEVELS[index],
          descriptor,
        }))
      : DEFAULT_LEVELS.map((level) => ({ ...level })),
    sterkZin:
      starter?.sterkZin ??
      `Je laat bij ${naam.toLowerCase()} zien wat al goed gaat.`,
    groeiZin:
      starter?.groeiZin ??
      `Bij ${naam.toLowerCase()} kun je nog een stap zetten.`,
    volgendeStap:
      starter?.volgendeStap ??
      "Gebruik de descriptoren hierboven als checklist bij je volgende poging.",
  };
}

export function valideerRubric(rubric: Rubric): string[] {
  const fouten: string[] = [];
  if (!rubric.titel.trim()) fouten.push("Vul een opdracht in.");
  if (rubric.criteria.length < 2 || rubric.criteria.length > 6)
    fouten.push("Gebruik 2 tot 6 criteria.");
  if (!Number.isFinite(rubric.maxPunten) || rubric.maxPunten <= 0)
    fouten.push("Het maximum aantal punten moet groter zijn dan 0.");
  if (rubric.cesuur !== null && (!Number.isFinite(rubric.cesuur) || rubric.cesuur <= 1 || rubric.cesuur >= 99))
    fouten.push("De cesuur moet strikt tussen 1 en 99 procent liggen.");
  rubric.criteria.forEach((criterium) => {
    if (!criterium.naam.trim()) fouten.push("Geef elk criterium een naam.");
    if (criterium.niveaus.length < 3 || criterium.niveaus.length > 4)
      fouten.push("Gebruik 3 of 4 niveaus per criterium.");
  });
  return fouten;
}

export function puntenVoor(criterium: Criterium, niveau: Niveau) {
  return criterium.niveaus[niveau - 1]?.punten ?? 0;
}

export function valideerInitialen(waarde: string) {
  const tekst = waarde.trim();
  if (!tekst || tekst.length > 8) return false;
  // Single letters each followed by a dot (L.J., L. J., L.J.v.D.) or up to 3 capitals (LJ, LJK).
  const metPunten = /^(?:[A-Za-zÀ-ÖØ-öø-ÿ]\.[ -]?){1,4}$/.test(tekst);
  const hoofdletters = /^[A-ZÀ-ÖØ-Ý]{1,3}$/.test(tekst);
  return metPunten || hoofdletters;
}

export function berekenCijfer(
  punten: number,
  maxPunten: number,
  cesuur: number,
) {
  if (!Number.isFinite(punten) || !Number.isFinite(maxPunten) || maxPunten <= 0 || !Number.isFinite(cesuur) || cesuur <= 1 || cesuur >= 99)
    return null;
  const cesuurPunten = maxPunten * (cesuur / 100);
  const cijfer =
    punten <= cesuurPunten
      ? 1 + 4.5 * (punten / cesuurPunten)
      : 5.5 + 4.5 * ((punten - cesuurPunten) / (maxPunten - cesuurPunten));
  return Math.round(Math.max(1, Math.min(10, cijfer)) * 10) / 10;
}
