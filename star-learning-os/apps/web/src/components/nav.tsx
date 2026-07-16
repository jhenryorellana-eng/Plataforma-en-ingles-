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

/** Tab bar iOS: traslúcida, hairline superior, tinte de acento en la activa. */
export function BottomNav({ locale, programCode }: { locale: string; programCode: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación principal"
      className="material-bar fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[max(env(safe-area-inset-bottom),8px)]"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2 pt-1.5">
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

/** Barra superior traslúcida mínima: marca a la izquierda, acción de texto a la derecha. */
export function TopBar({ locale }: { locale: string; subtitle?: string }) {
  const router = useRouter();
  return (
    <header className="material-bar sticky top-0 z-40 border-b border-line">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
        <Wordmark />
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
    </header>
  );
}
