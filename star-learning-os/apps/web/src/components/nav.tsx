'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { EconomyBadge } from './economy-badge';
import { Icon, StarMark, Wordmark } from './ui';
import styles from './nav.module.css';

const TABS = [
  { slug: 'today', label: 'Hoy', caption: 'Misión diaria', icon: 'today' },
  { slug: 'path', label: 'Ruta', caption: 'Constelaciones', icon: 'route' },
  { slug: 'voice', label: 'Mentor', caption: 'Nova en línea', icon: 'mic' },
  { slug: 'review', label: 'Repasar', caption: 'Memoria activa', icon: 'review' },
  { slug: 'progress', label: 'Progreso', caption: 'Tu evidencia', icon: 'progress' },
] as const;

/** La lección es inmersiva: sin navegación que compita por atención. */
function isImmersive(pathname: string): boolean {
  return pathname.includes('/lesson/');
}

/** Marco del área de aprendizaje: control de misión en escritorio y dock táctil en móvil. */
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
    <div className={`${styles.learnShell} mission-shell min-h-dvh ${immersive ? '' : 'lg:pl-64'}`}>
      {!immersive && <TopBar locale={locale} programCode={programCode} />}
      <SideNav locale={locale} programCode={programCode} />
      <main
        className={
          immersive
            ? 'mx-auto w-full max-w-2xl px-4 pb-44 pt-6 lg:pt-10'
            : 'mx-auto w-full max-w-2xl px-4 pb-32 pt-5 sm:px-5 lg:max-w-4xl lg:px-10 lg:pb-20 lg:pt-9 xl:max-w-5xl'
        }
      >
        {children}
      </main>
      <BottomNav locale={locale} programCode={programCode} />
    </div>
  );
}

/** Dock móvil: las cuatro áreas rodean a Nova, que funciona como botón protagonista. */
export function BottomNav({ locale, programCode }: { locale: string; programCode: string }) {
  const pathname = usePathname();
  if (isImmersive(pathname)) return null;
  return (
    <nav aria-label="Navegación principal" className={styles.bottomNav}>
      <div className={styles.bottomDock}>
        {TABS.map((tab) => {
          const href = `/${locale}/learn/${programCode}/${tab.slug}`;
          const active = pathname.startsWith(href);
          const isNova = tab.slug === 'voice';
          return (
            <Link
              key={tab.slug}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={isNova ? 'Hablar con Nova, tu Mentor' : tab.label}
              className={styles.bottomTab}
              data-active={active}
              data-nova={isNova}
            >
              <span className={styles.bottomIcon}>
                {isNova && <span className={styles.novaSignal} aria-hidden />}
                <Icon name={tab.icon} className={isNova ? 'size-6' : 'size-[21px]'} />
              </span>
              <span className={styles.bottomLabel}>{tab.label}</span>
              <span className={styles.activeSignal} aria-hidden />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Rail de escritorio: identidad, destinos de la expedición y estado del explorador. */
export function SideNav({ locale, programCode }: { locale: string; programCode: string }) {
  const pathname = usePathname();
  const router = useRouter();
  if (isImmersive(pathname)) return null;
  return (
    <nav aria-label="Navegación principal" className={styles.sideNav}>
      <div className={styles.sideHeader}>
        <Wordmark className={styles.sideBrand} />
        <span className={styles.expeditionLabel}>
          <StarMark className="size-3 text-gold" />
          Expedición Aurora
        </span>
      </div>

      <div className={styles.sideList}>
        <p className={styles.sideListLabel}>Control de misión</p>
        {TABS.map((tab) => {
          const href = `/${locale}/learn/${programCode}/${tab.slug}`;
          const active = pathname.startsWith(href);
          const isNova = tab.slug === 'voice';
          return (
            <Link
              key={tab.slug}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={styles.sideLink}
              data-active={active}
              data-nova={isNova}
            >
              <span className={styles.sideIcon}>
                {isNova && <span className={styles.novaSignal} aria-hidden />}
                <Icon name={tab.icon} className="size-[21px]" />
              </span>
              <span className={styles.sideCopy}>
                <strong>{tab.label}</strong>
                <small>{tab.caption}</small>
              </span>
              <span className={styles.sideStatus} aria-hidden>
                {active ? <StarMark className="size-3" /> : <span />}
              </span>
            </Link>
          );
        })}
      </div>

      <div className={styles.sideFooter}>
        <div className={styles.profilePanel}>
          <span className={styles.profileLabel}>Tu cabina</span>
          <EconomyBadge locale={locale} programCode={programCode} />
        </div>
        <div className={styles.sideControls}>
          <ThemeToggle />
          <button
            type="button"
            onClick={async () => {
              // Salir SIEMPRE navega: si la API es inalcanzable, la cookie local expira igual.
              try {
                await clientApi('/auth/logout', { method: 'POST' });
              } finally {
                router.push(`/${locale}/login`);
              }
            }}
            className={styles.logoutButton}
          >
            <Icon name="logout" className="size-5" />
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      next === 'dark' ? '#07111f' : '#eef4f8',
    );
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
      className={`${styles.controlButton} ${className}`}
    >
      <Icon name={dark ? 'sun' : 'moon'} className="size-5" />
    </button>
  );
}

/** Cabecera móvil compacta con marca, economía y controles de sesión. */
export function TopBar({ locale, programCode }: { locale: string; programCode: string; subtitle?: string }) {
  const router = useRouter();
  return (
    <header className={styles.topBar}>
      <div className={styles.topBarInner}>
        <Wordmark className={styles.topBrand} />
        <div className={styles.topActions}>
          <EconomyBadge locale={locale} programCode={programCode} compact />
          <ThemeToggle />
          <button
            type="button"
            aria-label="Cerrar sesión"
            className={`${styles.controlButton} ${styles.logoutControl}`}
            onClick={async () => {
              // Salir SIEMPRE navega: si la API es inalcanzable, la cookie local expira igual.
              try {
                await clientApi('/auth/logout', { method: 'POST' });
              } finally {
                router.push(`/${locale}/login`);
              }
            }}
          >
            <Icon name="logout" className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
