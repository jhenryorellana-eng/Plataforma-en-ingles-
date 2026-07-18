import type { AvatarConfig } from '@star/contracts';

interface Option<T extends string> {
  id: T;
  label: string;
}

const SKINS: Record<AvatarConfig['species'], string[]> = {
  human: ['#f8d5c2', '#eab892', '#c98a5e', '#a06a42', '#7a4b2a', '#5a3620'],
  alien: ['#b9f6ca', '#8fe6a0', '#5fd0a0', '#3fb8a0', '#7dd8ff', '#b9a8ff'],
};

/** Catálogo de opciones del creador de avatar (ids = valores del contrato). */
export const AVATAR_OPTIONS = {
  species: [
    { id: 'human', label: 'Humano' },
    { id: 'alien', label: 'Alien' },
  ] as Option<AvatarConfig['species']>[],
  skins: SKINS,
  hairColors: ['#2c1b0e', '#6b3f1d', '#b08968', '#e0c37e', '#c94f7c', '#5e5ce6'],
  hairStyles: [
    { id: 'none', label: 'Calvo' },
    { id: 'short', label: 'Corto' },
    { id: 'spiky', label: 'Puntas' },
    { id: 'long', label: 'Largo' },
    { id: 'curly', label: 'Rizos' },
    { id: 'buns', label: 'Moños' },
  ] as Option<AvatarConfig['hairStyle']>[],
  faceShapes: [
    { id: 'round', label: 'Redondo' },
    { id: 'oval', label: 'Ovalado' },
    { id: 'square', label: 'Cuadrado' },
  ] as Option<AvatarConfig['faceShape']>[],
  eyes: [
    { id: 'normal', label: 'Normal' },
    { id: 'happy', label: 'Feliz' },
    { id: 'big', label: 'Grandes' },
    { id: 'alien', label: 'Alien' },
  ] as Option<AvatarConfig['eyes']>[],
  mouths: [
    { id: 'smile', label: 'Sonrisa' },
    { id: 'grin', label: 'Dientes' },
    { id: 'calm', label: 'Sereno' },
  ] as Option<AvatarConfig['mouth']>[],
  outfits: [
    { id: 'hoodie', label: 'Sudadera' },
    { id: 'tee', label: 'Polo' },
    { id: 'space', label: 'Espacial' },
  ] as Option<AvatarConfig['outfit']>[],
};

export const DEFAULT_AVATAR: AvatarConfig = {
  species: 'human',
  skin: '#eab892',
  hairStyle: 'short',
  hairColor: '#2c1b0e',
  faceShape: 'round',
  eyes: 'normal',
  mouth: 'smile',
  outfit: 'hoodie',
  accessories: [],
};

/** Ejemplo para la tarjeta de especie alien en el selector. */
export const ALIEN_EXAMPLE: AvatarConfig = {
  ...DEFAULT_AVATAR,
  species: 'alien',
  skin: '#8fe6a0',
  eyes: 'alien',
  hairStyle: 'spiky',
  hairColor: '#5e5ce6',
};
