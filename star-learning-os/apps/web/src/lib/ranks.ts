export interface Rank {
  name: string;
  min: number;
  color: string;
  next: string | null;
}

/** Rangos con identidad espacial: el % de dominio define tu título. */
export const RANKS: Rank[] = [
  { name: 'Cadete estelar', min: 0, color: '#9c9cb2', next: 'Piloto novato' },
  { name: 'Piloto novato', min: 0.15, color: '#4da3ff', next: 'Piloto estelar' },
  { name: 'Piloto estelar', min: 0.4, color: '#17b8cd', next: 'Capitán STAR' },
  { name: 'Capitán STAR', min: 0.65, color: '#8a88ff', next: 'Leyenda' },
  { name: 'Leyenda', min: 0.85, color: '#ffb340', next: null },
];

export function rankFor(mastery: number): Rank {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (mastery >= rank.min) current = rank;
  }
  return current;
}
