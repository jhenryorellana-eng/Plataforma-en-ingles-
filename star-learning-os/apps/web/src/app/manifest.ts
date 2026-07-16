import type { MetadataRoute } from 'next';

/** PWA instalable (Especificación §16: web adaptable y PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StarbizAcademy — STAR Learning OS',
    short_name: 'Starbiz',
    description:
      'Tu ruta medible desde tu nivel real hasta tu meta en inglés, con tu Mentor STAR.',
    id: '/es-PE',
    start_url: '/es-PE',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f4fb',
    theme_color: '#5e5ce6',
    lang: 'es-PE',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
