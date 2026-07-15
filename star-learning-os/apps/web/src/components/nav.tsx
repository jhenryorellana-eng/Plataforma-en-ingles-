'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { StarLogo } from './ui';

const TABS = [
  { slug: 'today', label: 'Inicio', icon: '✦' },
  { slug: 'path', label: 'Ruta', icon: '☄' },
  { slug: 'voice', label: 'Hablar', icon: '◉' },
  { slug: 'review', label: 'Repasar', icon: '↻' },
  { slug: 'progress', label: 'Progreso', icon: '▲' },
] as const;

export function BottomNav({ locale, programCode }: { locale: string; programCode: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-night/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
        {TABS.map((tab) => {
          const href = `/${locale}/learn/${programCode}/${tab.slug}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={tab.slug}
              href={href}
              className={`flex min-w-16 flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                active ? 'text-star' : 'text-dim hover:text-ink'
              }`}
            >
              <span aria-hidden className="text-base leading-none">
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({ locale, subtitle }: { locale: string; subtitle?: string }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-night/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex flex-col">
          <StarLogo className="text-base" />
          {subtitle && <span className="text-xs text-dim">{subtitle}</span>}
        </div>
        <button
          type="button"
          className="rounded-lg border border-line px-3 py-1.5 text-xs text-dim transition-colors hover:border-risk/50 hover:text-risk"
          onClick={async () => {
            await clientApi('/auth/logout', { method: 'POST' });
            router.push(`/${locale}/login`);
          }}
        >
          Salir
        </button>
      </div>
    </header>
  );
}
