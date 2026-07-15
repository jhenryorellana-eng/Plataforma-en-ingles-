'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { Icon, Wordmark } from './ui';

const TABS = [
  { slug: 'today', label: 'Inicio', icon: 'today' },
  { slug: 'path', label: 'Ruta', icon: 'route' },
  { slug: 'voice', label: 'Hablar', icon: 'mic' },
  { slug: 'review', label: 'Repasar', icon: 'review' },
  { slug: 'progress', label: 'Progreso', icon: 'progress' },
] as const;

export function BottomNav({ locale, programCode }: { locale: string; programCode: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
        {TABS.map((tab) => {
          const href = `/${locale}/learn/${programCode}/${tab.slug}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={tab.slug}
              href={href}
              className={`relative flex min-w-16 flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? 'text-primary' : 'text-dim hover:text-ink'
              }`}
            >
              {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-primary" />}
              <Icon name={tab.icon} className="size-5" />
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
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="masthead-rule" />
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex flex-col">
          <Wordmark />
          {subtitle && (
            <span className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-dim">{subtitle}</span>
          )}
        </div>
        <button
          type="button"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-dim transition-colors hover:border-risk/40 hover:text-risk"
          onClick={async () => {
            await clientApi('/auth/logout', { method: 'POST' });
            router.push(`/${locale}/login`);
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
