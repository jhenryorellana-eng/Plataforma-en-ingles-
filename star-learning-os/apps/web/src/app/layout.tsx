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
  themeColor: '#07111f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${onest.variable} antialiased`}>
        {/* Tema antes del primer paint: elección guardada o preferencia del sistema. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('star-theme');if(t!=='dark'&&t!=='light'){t='dark'}document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name=theme-color]');if(m)m.content=t==='dark'?'#07111f':'#eef4f8'}catch(e){document.documentElement.dataset.theme='dark'}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
