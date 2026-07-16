import type { CapacitorConfig } from '@capacitor/cli';

/**
 * App nativa (Android/iOS) con Capacitor envolviendo la web SSR.
 * En desarrollo, apunta CAP_SERVER_URL a tu servidor Next:
 *   - Emulador Android:  CAP_SERVER_URL=http://10.0.2.2:3000
 *   - Dispositivo real:  CAP_SERVER_URL=http://<IP-de-tu-PC>:3000
 * En producción, la URL pública desplegada (HTTPS). Sin CAP_SERVER_URL,
 * la app carga el shell local de "sin conexión".
 */
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'pe.starbiz.academy',
  appName: 'StarbizAcademy',
  webDir: 'capacitor-shell',
  backgroundColor: '#f5f4fb',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: devServerUrl.startsWith('http://'),
        },
      }
    : {}),
};

export default config;
