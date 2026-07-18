'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { EconomyBadge } from './economy-badge';
import { Icon, Wordmark } from './ui';

const TABS = [
  { slug: 'today', label: 'Inicio', icon: 'today' },
  { slug: 'path', label: 'Ruta', icon: 'route' },
  { slug: 'voice', label: 'Hablar', icon: 'mic' },
  { slug: 'review', label: 'Repasar', icon: 'review' },
  { slug: 'progress', label: 'Progreso', icon: 'progress' },
] as const;

/** La lección es inmersiva: sin navegación que compita por atención. */
function isImmersive(pathname: string): boolean {
  return pathname.includes('/lesson/');
}

/** Marco del área de aprendizaje: rail en escritorio, dock en móvil, nada en la lección. */
export function LearnShell({
  locale,
  programCode,
  children,
}: {
  locale: string;
  programCode: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const immersive = isImmersive(pathname);
  return (
    <div className={`min-h-dvh ${immersive ? '' : 'lg:pl-64'}`}>
      {!immersive && <TopBar locale={locale} programCode={programCode} />}
      <SideNav locale={locale} programCode={programCode} />
      <main
        className={
          immersive
            ? 'mx-auto w-full max-w-2xl px-4 pb-44 pt-6 lg:pt-10'
            : 'mx-auto w-full max-w-2xl px-4 pb-36 pt-6 lg:max-w-4xl lg:px-10 lg:pb-20 lg:pt-10 xl:max-w-5xl'
        }
      >
        {children}
      </main>
      <BottomNav locale={locale} programCode={programCode} />
    </div>
  );
}

/** Dock flotante de cristal con tinte de acento en la pestaña activa (solo móvil/tablet). */
export function BottomNav({ locale, programCode }: { locale: string; programCode: string }) {
  const pathname = usePathname();
  if (isImmersive(pathname)) return null;
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-4 bottom-[max(env(safe-area-inset-bottom),12px)] z-40 mx-auto max-w-md lg:hidden"
    >
      <div className="glass-dock flex items-stretch justify-between rounded-[26px] px-2 py-1.5">
        {TABS.map((tab) => {
          const href = `/${locale}/learn/${programCode}/${tab.slug}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={tab.slug}
              href={href}
              className={`flex min-w-14 flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold transition-colors ${
                active ? 'text-primary' : 'text-[#9a9aae] hover:text-dim'
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-primary-soft' : ''
                }`}
              >
                <Icon name={tab.icon} className="size-[22px]" />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Rail lateral de escritorio: marca arriba, pestañas, sesión abajo. */
export function SideNav({ locale, programCode }: { locale: string; programCode: string }) {
  const pathname = usePathname();
  const router = useRouter();
  if (isImmersive(pathname)) return null;
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface/70 px-4 py-6 backdrop-blur-xl lg:flex"
    >
      <Wordmark className="px-2" />
      <div className="mt-9 flex flex-col gap-1">
        {TABS.map((tab) => {
          const href = `/${locale}/learn/${programCode}/${tab.slug}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={tab.slug}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors ${
                active ? 'bg-primary-soft text-primary' : 'text-dim hover:bg-mist hover:text-ink'
              }`}
            >
              <Icon name={tab.icon} className="size-[22px]" />
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div className="mt-auto flex flex-col gap-1">
        <EconomyBadge locale={locale} programCode={programCode} />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            type="button"
            onClick={async () => {
              await clientApi('/auth/logout', { method: 'POST' });
              router.push(`/${locale}/login`);
            }}
            className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-dim transition-colors hover:bg-mist hover:text-ink"
          >
            <Icon name="logout" className="size-[22px]" />
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}

/** Alterna modo oscuro/claro; persiste en localStorage (lo lee el script del layout). */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark');
  }, []);

  function toggle() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('star-theme', next);
    } catch {
      // modo incógnito estricto: el tema dura solo la sesión
    }
    setDark(next === 'dark');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`flex size-9 items-center justify-center rounded-full text-dim transition-colors hover:bg-mist hover:text-ink ${className}`}
    >
      <Icon name={dark ? 'sun' : 'moon'} className="size-5" />
    </button>
  );
}

/** Barra superior traslúcida mínima: marca a la izquierda, acciones a la derecha. */
export function TopBar({ locale, programCode }: { locale: string; programCode: string; subtitle?: string }) {
  const router = useRouter();
  return (
    <header className="material-bar sticky top-0 z-40 border-b border-line lg:hidden">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
        <Wordmark />
        <div className="flex items-center gap-1.5">
          <EconomyBadge locale={locale} programCode={programCode} compact />
          <ThemeToggle />
          <button
            type="button"
            className="text-[15px] font-medium text-primary transition-opacity hover:opacity-70"
            onClick={async () => {
              await clientApi('/auth/logout', { method: 'POST' });
              router.push(`/${locale}/login`);
            }}
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
