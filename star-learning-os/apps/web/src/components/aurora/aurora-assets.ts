export const AURORA_ASSETS = {
  today: {
    desktop: '/brand/aurora/today-wide.webp',
    mobile: '/brand/aurora/today-mobile.webp',
    desktopSize: { width: 1672, height: 941 },
    mobileSize: { width: 1448, height: 1086 },
  },
  starmap: {
    desktop: '/brand/aurora/starmap-wide.webp',
    mobile: '/brand/aurora/starmap-mobile.webp',
    desktopSize: { width: 1672, height: 941 },
    mobileSize: { width: 1447, height: 1087 },
  },
  family: {
    desktop: '/brand/aurora/family-wide.webp',
    mobile: '/brand/aurora/family-mobile.webp',
    desktopSize: { width: 1672, height: 941 },
    mobileSize: { width: 1448, height: 1086 },
  },
} as const;

export type AuroraAssetName = keyof typeof AURORA_ASSETS;
