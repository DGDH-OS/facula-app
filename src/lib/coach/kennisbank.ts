export type CoachActie = { label: string; href: string };
export type CoachBron = { titel: string; url: string };
export type KennisEntry = {
  id: string;
  vragen: string[];
  trefwoorden: string[];
  antwoord: string;
  acties?: CoachActie[];
  bronnen?: CoachBron[];
};

const basisBron: CoachBron = {
  titel: "Kennisnet",
  url: "https://www.kennisnet.nl/",
};
const bronnenPerOnderwerp: Record<string, CoachBron[]> = {
  "avg-delen": [
    {
      titel: "Autoriteit Persoonsgegevens",
      url: "https://autoriteitpersoonsgegevens.nl/",
    },
    { titel: "Kennisnet privacy", url: "https://www.kennisnet.nl/" },
  ],
  "avg-initialen": [
    {
      titel: "Autoriteit Persoonsgegevens",
      url: "https://autoriteitpersoonsgegevens.nl/",
    },
    { titel: "Kennisnet privacy", url: "https://www.kennisnet.nl/" },
  ],
  "avg-diagnose": [
    {
      titel: "Autoriteit Persoonsgegevens",
      url: "https://autoriteitpersoonsgegevens.nl/",
    },
    { titel: "Kennisnet privacy", url: "https://www.kennisnet.nl/" },
  ],
  "toets-maken": [
    { titel: "SLO", url: "https://www.slo.nl/" },
    { titel: "Kennisnet", url: "https://www.kennisnet.nl/" },
  ],
  toetsmatrijs: [
    { titel: "SLO", url: "https://www.slo.nl/" },
    { titel: "Kennisnet", url: "https://www.kennisnet.nl/" },
  ],
  bloom: [
    { titel: "SLO", url: "https://www.slo.nl/" },
    { titel: "Kennisnet", url: "https://www.kennisnet.nl/" },
  ],
  "ai-klas": [{ titel: "Kennisnet", url: "https://www.kennisnet.nl/" }],
  werkdruk: [{ titel: "Rijksoverheid", url: "https://www.rijksoverheid.nl/" }],
};
const acties = (href: string, label: string): CoachActie[] => [{ href, label }];
const data: Array<[string, string[], string[], string, CoachActie[]?]> = [
  [
    "les-maken",
    ["Hoe maak ik een les", "les voorbereiden"],
    ["les", "maken", "voorbereiden"],
    "Begin met één leerdoel. Kies daarna een korte startvraag, leg de kern stap voor stap uit en laat leerlingen oefenen. Sluit af met een check: wat kunnen zij nu zelfstandig? Houd per onderdeel de tijd bij en zet materiaal klaar.",
    acties("/app/lessons/new", "Maak een les"),
  ],
  [
    "lesopbouw",
    ["Hoe bouw ik een les op", "lesindeling", "les opbouw"],
    ["lesopbouw", "start", "instructie", "oefenen"],
    "Gebruik een vaste volgorde: doel en voorkennis activeren, uitleg, samen oefenen, zelfstandig verwerken en afsluiten met een korte check. Zet het doel zichtbaar. Plan liever minder onderdelen met voldoende oefentijd.",
    acties("/app/lessons/new", "Nieuwe les"),
  ],
  [
    "edi",
    ["directe instructie", "EDI les"],
    ["directe", "instructie", "edi"],
    "Maak het doel klein en zichtbaar. Doe het eerst voor, denk hardop, oefen samen en laat daarna zelfstandig werken. Controleer tussendoor met korte vragen. Geef direct een kleine correctie en laat opnieuw proberen.",
  ],
  [
    "differentiatie",
    ["Hoe differentieer ik", "verschillende niveaus"],
    ["differentieer", "niveau", "niveaus"],
    "Werk met drie routes: extra uitleg en een voorbeeld, de basisopdracht en een verdiepende toepassing. Beschrijf per route hetzelfde doel in passende stappen. Laat leerlingen waar mogelijk wisselen na een korte check.",
  ],
  [
    "differentiatie-3",
    ["drie niveaus in een les", "basis plus verdieping"],
    ["drie", "3", "nivo", "niveau", "basis", "verdieping"],
    "Maak een basisroute, een route met steun en een plusroute. Gebruik dezelfde kernbegrippen, maar varieer in hoeveelheid hulp, tempo en complexiteit. Noteer vooraf wanneer je een leerling naar een andere route laat gaan.",
  ],
  [
    "toets-maken",
    ["Hoe maak ik een toets", "toets opstellen"],
    ["toets", "maken", "opstellen"],
    "Schrijf eerst de leerdoelen op. Kies daarna per doel een vraagtype en bepaal de punten. Maak de instructie kort, controleer of elke vraag één vaardigheid toetst en lees de toets één keer als leerling.",
    acties("/app/nakijken", "Open Nakijkhulp"),
  ],
  [
    "toetsmatrijs",
    ["toetsmatrijs maken", "blauwdruk toets", "toets matries"],
    ["toetsmatrijs", "matries", "blauwdruk", "verdeling"],
    "Zet leerdoelen in rijen en vraagtypen of niveaus in kolommen. Verdeel daarna de vragen en punten. Zo zie je snel of een belangrijk doel te weinig of juist te vaak voorkomt.",
  ],
  [
    "bloom",
    ["Bloom gebruiken", "taxonomie toets", "Bloom in toets"],
    ["bloom", "taxonomie", "herinneren", "toepassen"],
    "Begin bij het doel en kies een passend niveau: onthouden, begrijpen, toepassen, analyseren, evalueren of creëren. Een moeilijk woord maakt een vraag niet automatisch moeilijk; kijk naar de denkactie.",
  ],
  [
    "nakijken",
    ["sneller nakijken", "nakijken kost tijd"],
    ["nakijken", "sneller", "tijd"],
    "Gebruik vooraf een korte rubric met drie criteria. Markeer per antwoord één sterk punt en één volgende stap. Werk per vraag of per klas in batches en noteer terugkerende fouten voor je volgende instructie.",
    acties("/app/tests/new", "Maak een toets"),
  ],
  [
    "rubrics",
    ["rubric maken", "beoordelingsrubriek"],
    ["rubric", "criteria", "beoordelen"],
    "Kies maximaal drie zichtbare criteria. Beschrijf per criterium wat je ziet op drie niveaus: nog niet, deels en zelfstandig. Voeg één voorbeeld toe. Gebruik dezelfde woorden in de opdracht en in je feedback.",
  ],
  [
    "feedback",
    ["feedback geven", "feedback in drie stappen"],
    ["feedback", "sterk", "volgende"],
    "Gebruik drie stappen: benoem wat al lukt, wijs één concreet verbeterpunt aan en geef een kleine oefenstap. Laat de leerling de stap uitvoeren of in eigen woorden herhalen.",
  ],
  [
    "formatief",
    ["formatief handelen", "formatief werken"],
    ["formatief", "check", "bijsturen"],
    "Plan korte checks tijdens de les: wisbordje, duim of een exit-ticket. Kijk direct wat de groep nodig heeft. Geef extra instructie, een voorbeeld of verdieping voordat je doorgaat.",
  ],
  [
    "klassenmanagement",
    ["klassenmanagement basis", "rust in de klas"],
    ["klassenmanagement", "rust", "regels"],
    "Kies drie positieve routines: binnenkomen, materiaal pakken en afsluiten. Oefen ze expliciet. Geef een korte aanwijzing, benoem gewenst gedrag en bespreek na de les wat je morgen anders doet.",
  ],
  [
    "werkdruk",
    ["minder werkdruk", "te veel werk"],
    ["werkdruk", "druk", "prioriteit"],
    "Kies vandaag één noodzakelijk resultaat. Bundel vergelijkbare taken, gebruik vaste formats en plan een stoptijd. Zet vragen die kunnen wachten op een lijst. Maak de volgende stap klein.",
  ],
  [
    "toetsweek-piekbelasting",
    ["te veel toetsen in één week", "piekbelasting toetsweek"],
    ["toetsweek", "piek", "belasting", "te druk"],
    "Zet elke toets en deadline per klas in een overzicht per week. Twee toetsen in"
      + " dezelfde week is al druk, drie is te druk. Spreid waar het kan, en meld het"
      + " op tijd aan collega's die dezelfde klas hebben.",
    acties("/app/toetsweek", "Open Toetsweekplanner"),
  ],
  [
    "nakijkplanning",
    ["nakijktijd plannen", "nakijkplanning maken"],
    ["nakijkplanning", "nakijktijd", "cijferdeadline"],
    "Plan je nakijktijd terug vanaf de cijferdeadline: leerlingen keer minuten per"
      + " leerling, verdeeld over de werkdagen die je nog hebt. Zo zie je op tijd of"
      + " een deadline haalbaar is of dat je hem beter verzet.",
    acties("/app/toetsweek", "Open Toetsweekplanner"),
  ],
  [
    "rapport-structuur",
    ["rapport schrijven", "rapporttekst"],
    ["rapport", "schrijven", "sterkte", "aandacht"],
    "Gebruik vier delen: een concrete sterkte, één aandachtspunt, een zichtbaar voorbeeld en een haalbare vervolgstap. Schrijf feitelijk en vriendelijk. Vermijd labels en vergelijkingen.",
    acties("/app/reports/new", "Schrijf een rapporttekst"),
  ],
  [
    "rapport-werkpunt",
    ["werkpunt rapport", "aandachtspunt schrijven"],
    ["werkpunt", "werkpunte", "aandachtspunt", "rapport"],
    "Formuleer gedrag dat je ziet: wat gebeurt er, wanneer en wat helpt? Schrijf daarna één oefenstap. Bijvoorbeeld: ‘Bij lange opdrachten helpt het om eerst drie kernwoorden te markeren.’",
  ],
  [
    "oudergesprek",
    ["oudergesprek voorbereiden", "gesprek met ouders"],
    ["oudergesprek", "ouders", "voorbereiden"],
    "Noteer doel, twee concrete observaties, wat al werkt en één vervolgstap. Begin met samenwerking. Vraag wat ouders herkennen en spreek af wie wat doet en wanneer je terugkijkt.",
    acties("/app/ouders", "Bereid een gesprek voor"),
  ],
  [
    "tien-minuten",
    ["10 minuten gesprek", "kort oudergesprek"],
    ["10-minutengesprek", "kort", "gesprek"],
    "Kies vooraf één hoofdvraag. Verdeel de tijd in welkom, observatie, luisteren, afspraak en afronding. Schrijf maximaal één concrete afspraak op en controleer of iedereen die hetzelfde begrijpt.",
  ],
  [
    "lastige-boodschap",
    ["lastige boodschap brengen", "slecht nieuws ouders"],
    ["lastige", "boodschap", "moeilijk", "ouders"],
    "Beschrijf eerst de feiten zonder oordeel. Erken dat dit lastig kan zijn, luister en geef daarna één haalbare stap. Vermijd diagnoses en voorspellingen. Sluit af met een moment om opnieuw te spreken.",
  ],
  [
    "oudermail",
    ["mail naar ouders", "oudercommunicatie"],
    ["oudermail", "mail", "ouders"],
    "Houd de mail kort: reden, feit, wat je vraagt en wanneer je reageert. Gebruik een neutrale onderwerpregel. Zet geen gevoelige leerlinginformatie in een groepsmail. Lees de mail na alsof hij wordt doorgestuurd.",
    acties("/app/ouders", "Maak een oudermail"),
  ],
  [
    "avg-delen",
    ["wat mag ik delen", "AVG delen met ouders"],
    ["avg", "delen", "privacy", "naam", "leerling", "mailen", "versturen"],
    "Deel alleen wat nodig is met de juiste ontvanger. Controleer adressen en gebruik BCC bij een groep. Zet geen medische of gevoelige details in een gewone mail. Vraag bij twijfel je schoolleiding of privacycontact.",
  ],
  [
    "avg-initialen",
    ["initialen gebruiken", "leerling pseudoniem"],
    ["initialen", "pseudoniem", "naam", "leerling", "mailen", "versturen"],
    "Initialen helpen, maar maken informatie niet automatisch anoniem. Combineer zo min mogelijk kenmerken en deel alleen met mensen die het nodig hebben. Zet leerlingnamen niet in deze coachchat.",
  ],
  [
    "avg-diagnose",
    ["diagnose in mail", "medische informatie delen"],
    ["diagnose", "medisch", "gezondheid"],
    "Zet geen diagnose of medische details in een gewone oudermail. Beschrijf alleen wat nodig is voor school en stem gevoelige communicatie af met de juiste schoolfunctionaris.",
  ],
  [
    "ai-klas",
    ["AI in de klas", "mag AI gebruiken"],
    ["ai", "klas", "transparant"],
    "Leg uit waarvoor je een hulpmiddel gebruikt en laat leerlingen weten wanneer iets met AI is gemaakt. Controleer uitkomsten zelf. Voer geen persoonsgegevens in en gebruik AI niet om leerlingen te beoordelen, te profileren of emoties te raden.",
  ],
  [
    "nieuwe-klas",
    ["eerste week nieuwe klas", "nieuwe groep"],
    ["eerste", "week", "nieuwe", "klas"],
    "Kies drie doelen: elkaar leren kennen, routines oefenen en een eerste leercheck. Houd regels kort, oefen ze en plan dagelijks een klein reflectiemoment.",
  ],
  [
    "invalwerk",
    ["invalwerk voorbereiden", "les voor invaller"],
    ["inval", "invaller", "voorbereiden"],
    "Schrijf doel, planning per blok, materiaal, vaste routines en een afsluitopdracht op één pagina. Zet erbij wat de invaller moet doen als de planning uitloopt.",
  ],
  [
    "weekplanning",
    ["weekplanning maken", "mijn week plannen"],
    ["weekplanning", "plannen", "week"],
    "Zet vaste afspraken eerst. Plan daarna blokken voor voorbereiden, nakijken en administratie. Houd dagelijks één leeg blok voor onverwachte zaken. Kies per blok één eindresultaat.",
  ],
  [
    "batchen",
    ["taken batchen", "werk bundelen"],
    ["batch", "bundelen", "zelfde"],
    "Bundel taken die hetzelfde soort aandacht vragen: alle mails, dezelfde vraag nakijken of meerdere lessen klaarzetten. Zet een timer en stop als het blok voorbij is.",
  ],
  [
    "e-mailgrenzen",
    ["grenzen aan mail ouders", "wanneer mail beantwoorden"],
    ["grenzen", "email", "e-mail", "ouders"],
    "Kies twee vaste momenten voor oudermail en zet een vriendelijke verwachting in je handtekening. Beantwoord niet direct buiten je werktijd, behalve bij afgesproken spoed.",
  ],
  [
    "les-functie",
    ["waar maak ik een les", "lessen in Facula"],
    ["facula", "les", "lessen"],
    "Ga naar ‘Nieuwe les’, kies vak, niveau en leerjaar en beschrijf het leerdoel. Controleer de opbouw en pas de tekst aan jouw klas aan.",
    acties("/app/lessons/new", "Nieuwe les"),
  ],
  [
    "toets-functie",
    ["waar maak ik een toets", "toets in Facula"],
    ["facula", "toets", "toetsen"],
    "Open ‘Nieuwe toets’, vul leerdoel en kernbegrippen in en kies het aantal vragen. Lees de antwoordsleutel na voordat je de toets gebruikt.",
    acties("/app/tests/new", "Nieuwe toets"),
  ],
  [
    "rapport-functie",
    ["waar schrijf ik rapport", "rapport in Facula"],
    ["facula", "rapport", "rapporten"],
    "Open ‘Nieuwe rapporttekst’. Kies het soort tekst en toon, voeg feitelijke observaties toe en controleer de voorgestelde tekst zelf.",
    acties("/app/reports/new", "Nieuwe rapporttekst"),
  ],
  [
    "school-instellingen",
    ["schoolinstellingen", "school instellen"],
    ["school", "instellingen", "instellen"],
    "Open School via de navigatie als je beheerder bent. Controleer de gegevens en deel alleen instellingen die voor collega’s nodig zijn.",
    acties("/app/school", "Naar school"),
  ],
  [
    "huisstijl",
    ["huisstijl aanpassen", "logo instellen"],
    ["huisstijl", "logo", "stijl"],
    "Open Huisstijl en kies de kleuren of het logo dat bij jullie school past. Bekijk het voorbeeld en sla pas op als de tekst leesbaar blijft.",
    acties("/app/huisstijl", "Huisstijl openen"),
  ],
  [
    "startscherm",
    ["wat staat op start", "mijn werk"],
    ["start", "werk", "overzicht"],
    "Op Start vind je je recente werk en de drie belangrijkste routes: les, toets en rapport. Gebruik de coach voor een volgende stap.",
    acties("/app", "Naar Start"),
  ],
  [
    "leerdoel",
    ["goed leerdoel", "leerdoel formuleren"],
    ["leerdoel", "doel", "formuleren"],
    "Schrijf wat de leerling aan het einde kan doen, met een zichtbaar werkwoord en een onderwerp. Maak het klein genoeg om in deze les te oefenen en te controleren.",
  ],
  [
    "exit-ticket",
    ["exit ticket", "afsluitvraag"],
    ["exit", "ticket", "afsluiten"],
    "Stel één vraag die direct het leerdoel raakt. Laat iedereen antwoorden, verzamel de signalen en gebruik ze om je volgende instructie te kiezen.",
  ],
  [
    "herstelgesprek",
    ["gedrag bespreken", "herstelgesprek klas"],
    ["gedrag", "herstel", "bespreken"],
    "Benoem rustig wat je zag, welk effect het had en welke afspraak nodig is. Luister kort naar het perspectief en maak de volgende stap concreet.",
  ],
  [
    "bron-gebruiken",
    ["bron bij les", "betrouwbare bron"],
    ["bron", "betrouwbaar", "les"],
    "Kijk naar afzender, datum en doel van een bron. Vergelijk bij twijfel twee bronnen en noteer de bron voor leerlingen. Gebruik officiële onderwijsbronnen als startpunt.",
  ],
  [
    "coach-veilig",
    ["wat doet de coach met mijn vraag", "privacy coach"],
    ["coach", "opslaan", "privacy"],
    "De coach gebruikt vaste kennis en bewaart je chat niet op de server. Deel geen namen, e-mailadressen, telefoonnummers of medische informatie. Jij controleert elke tip zelf.",
  ],
];

export const KENNISBANK: KennisEntry[] = data.map(
  ([id, vragen, trefwoorden, antwoord, actiesOpt]) => ({
    id,
    vragen,
    trefwoorden,
    antwoord,
    acties: actiesOpt,
    bronnen: bronnenPerOnderwerp[id] ?? [basisBron],
  }),
);
