import type { Metadata, Viewport } from 'next';
import { Schibsted_Grotesk, Unbounded } from 'next/font/google';
import './globals.css';

const display = Unbounded({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-unbounded',
});

const body = Schibsted_Grotesk({
  subsets: ['latin'],
  variable: '--font-schibsted',
});

export const metadata: Metadata = {
  title: 'StarbizAcademy — STAR Learning OS',
  description: 'Tu ruta medible desde tu nivel real hasta tu meta en inglés, con tu Mentor STAR.',
};

export const viewport: Viewport = {
  themeColor: '#0b0e1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable} antialiased`}>{children}</body>
    </html>
  );
}
