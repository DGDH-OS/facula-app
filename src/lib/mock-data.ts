export interface MockLesRij {
  id: string;
  titel: string;
  vak: string;
  niveau: string;
  leerjaar: number;
  status: "concept" | "klaar";
  bijgewerkt: string;
}

export interface MockToetsRij {
  id: string;
  titel: string;
  vak: string;
  niveau: string;
  leerjaar: number;
  vragen: number;
  bijgewerkt: string;
}

export const MOCK_LESSEN: MockLesRij[] = [
  {
    id: "demo-les-referentiekader",
    titel: "Referentiekader, framing & polarisatie — havo 4",
    vak: "Maatschappijleer",
    niveau: "havo",
    leerjaar: 4,
    status: "klaar",
    bijgewerkt: "vandaag",
  },
  {
    id: "demo-les-2",
    titel: "De Koude Oorlog — oorzaken en gevolgen",
    vak: "Geschiedenis",
    niveau: "vwo",
    leerjaar: 3,
    status: "concept",
    bijgewerkt: "gisteren",
  },
  {
    id: "demo-les-3",
    titel: "Vraag, aanbod en marktevenwicht",
    vak: "Economie",
    niveau: "havo",
    leerjaar: 4,
    status: "klaar",
    bijgewerkt: "3 dagen geleden",
  },
];

export const MOCK_TOETSEN: MockToetsRij[] = [
  {
    id: "demo-toets-referentiekader",
    titel: "Toets: referentiekader, desinformatie & polarisatie",
    vak: "Maatschappijleer",
    niveau: "havo",
    leerjaar: 4,
    vragen: 8,
    bijgewerkt: "vandaag",
  },
  {
    id: "demo-toets-2",
    titel: "Toets: verstedelijking en ruimtelijke ordening",
    vak: "Aardrijkskunde",
    niveau: "havo",
    leerjaar: 3,
    vragen: 6,
    bijgewerkt: "vorige week",
  },
];
