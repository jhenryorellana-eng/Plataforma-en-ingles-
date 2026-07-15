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

/** Dock flotante de cristal: navegación firma de la app. */
export function BottomNav({ locale, programCode }: { locale: string; programCode: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md"
    >
      <div className="glass flex items-stretch justify-between rounded-2xl px-1.5 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
        {TABS.map((tab) => {
          const href = `/${locale}/learn/${programCode}/${tab.slug}`;
          const active = pathname.startsWith(href);
          return (
            <Link
              key={tab.slug}
              href={href}
              className={`flex min-w-14 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium transition-all ${
                active
                  ? 'bg-primary-soft text-ink shadow-[0_0_18px_rgba(124,108,255,0.25)]'
                  : 'text-dim hover:text-ink'
              }`}
            >
              <Icon name={tab.icon} className={`size-5 ${active ? 'text-primary' : ''}`} />
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
    <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex flex-col">
          <Wordmark />
          {subtitle && (
            <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
              {subtitle}
            </span>
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
          Salir
        </button>
      </div>
    </header>
  );
}
