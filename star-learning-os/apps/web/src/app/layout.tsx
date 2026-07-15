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
  themeColor: '#f2f2f7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${onest.variable} antialiased`}>{children}</body>
    </html>
  );
}
