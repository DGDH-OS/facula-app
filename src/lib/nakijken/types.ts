export type Niveau = 1 | 2 | 3 | 4;
export type RubricLevel = { label: string; descriptor: string; punten: number };
export type Criterium = { id: string; naam: string; niveaus: RubricLevel[] };
export type Rubric = { titel: string; criteria: Criterium[]; maxPunten: number; cesuur: number | null };
export type Leerling = { id: string; initialen: string; keuzes: Record<string, Niveau>; notitie: string };
