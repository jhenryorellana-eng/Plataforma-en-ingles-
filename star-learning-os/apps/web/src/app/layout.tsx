import type { Metadata, Viewport } from 'next';
import { Onest } from 'next/font/google';
import './globals.css';

const onest = Onest({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-onest',
});

export const metadata: Metadata = {
  title: 'StarbizAcademy — STAR Learning OS',
  description: 'Tu ruta medible desde tu nivel real hasta tu meta en inglés.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f4fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c16' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${onest.variable} antialiased`}>
        {/* Tema antes del primer paint: elección guardada o preferencia del sistema. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('star-theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
