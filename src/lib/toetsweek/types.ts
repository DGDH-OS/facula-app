export type ToetsSoort =
  | "toets"
  | "so"
  | "praktische opdracht"
  | "inleverdeadline"
  | "mondeling";

export const TOETS_SOORTEN: ToetsSoort[] = [
  "toets",
  "so",
  "praktische opdracht",
  "inleverdeadline",
  "mondeling",
];

/** Standaard nakijkminuten per leerling, per soort. De docent kan dit per rij aanpassen. */
export const STANDAARD_NAKIJKMINUTEN: Record<ToetsSoort, number> = {
  toets: 8,
  so: 4,
  "praktische opdracht": 15,
  inleverdeadline: 5,
  mondeling: 10,
};

/** Piekzwaarte per soort. Een toets weegt zwaarder mee dan een so of deadline. */
export const GEWICHT_PER_SOORT: Record<ToetsSoort, number> = {
  toets: 1,
  so: 0.5,
  "praktische opdracht": 1,
  inleverdeadline: 0.5,
  mondeling: 1,
};

export type ToetsItem = {
  id: string;
  klas: string;
  vak: string;
  soort: ToetsSoort;
  datum: string;
  naam: string;
  aantalLeerlingen: number;
  nakijkminuten: number;
  cijferdeadline: string;
  notitie: string;
};

export type ToetsweekInstellingen = {
  nakijkminutenPerDag: number;
  vrijeWeekdagen: number[];
  extraVrijeDatums: string[];
  drukGrens: number;
  teDrukGrens: number;
};

export const STANDAARD_INSTELLINGEN: ToetsweekInstellingen = {
  nakijkminutenPerDag: 90,
  vrijeWeekdagen: [0, 6],
  extraVrijeDatums: [],
  drukGrens: 2,
  teDrukGrens: 3,
};

export function dupliceerToetsItem(item: ToetsItem): ToetsItem {
  return { ...item, id: `${item.id}-kopie-${Math.random().toString(36).slice(2, 8)}` };
}

export function nieuwToetsItem(klas = ""): ToetsItem {
  const soort: ToetsSoort = "toets";
  return {
    id: `toets-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    klas,
    vak: "",
    soort,
    datum: "",
    naam: "",
    aantalLeerlingen: 25,
    nakijkminuten: STANDAARD_NAKIJKMINUTEN[soort],
    cijferdeadline: "",
    notitie: "",
  };
}
