import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  accent = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(28,36,52,0.05)] ${
        accent ? 'border-t-2 border-t-primary' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`text-xs font-semibold uppercase tracking-[0.14em] text-dim ${className}`}>
      {children}
    </h2>
  );
}

export function Chip({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'gold' | 'ok' | 'warn' | 'risk' | 'primary';
}) {
  const tones: Record<string, string> = {
    default: 'border-line bg-mist/60 text-dim',
    gold: 'border-gold/50 bg-gold-soft text-gold-deep',
    ok: 'border-ok/40 bg-ok-soft text-ok',
    warn: 'border-warn/40 bg-warn-soft text-warn',
    risk: 'border-risk/40 bg-risk-soft text-risk',
    primary: 'border-primary/30 bg-primary-soft text-primary',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Medidor tipo instrumento de reporte académico. Las cuatro métricas
 * (cobertura, dominio, retención, readiness) SIEMPRE separadas (Especificación §6.4).
 */
export function Meter({
  label,
  value,
  hint,
  tone = 'primary',
}: {
  label: string;
  value: number | null;
  hint?: string;
  tone?: 'primary' | 'gold' | 'ok' | 'ink';
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary',
    gold: 'bg-gold',
    ok: 'bg-ok',
    ink: 'bg-ink',
  };
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink">{label}</span>
        <span className="font-display text-lg font-semibold tabular-nums text-ink">
          {value === null ? '—' : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-mist">
        {value !== null && (
          <div
            className={`h-full rounded-full ${tones[tone]} transition-[width] duration-700`}
            style={{ width: `${Math.min(100, Math.round(value * 100))}%` }}
          />
        )}
      </div>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-dim">{hint}</p>}
    </div>
  );
}

/** Estrella de cuatro puntas: la marca STAR, en trazo sobrio. */
export function StarMark({ className = 'size-4 text-gold' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2c.6 5.2 4.8 9.4 10 10-5.2.6-9.4 4.8-10 10-.6-5.2-4.8-9.4-10-10 5.2-.6 9.4-4.8 10-10z" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <StarMark className="size-4 text-gold" />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        Starbiz<span className="font-medium text-dim">Academy</span>
      </span>
    </span>
  );
}

/** Iconografía propia en SVG (trazo 1.75, sin librerías): nada de emojis. */
export function Icon({
  name,
  className = 'size-5',
}: {
  name: 'today' | 'route' | 'mic' | 'review' | 'progress' | 'shield' | 'flag' | 'pause' | 'play' | 'exit' | 'mute' | 'check' | 'arrow';
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    today: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
    route: (
      <>
        <circle cx="6" cy="19" r="2.2" />
        <circle cx="18" cy="5" r="2.2" />
        <path d="M8 19h6a4 4 0 0 0 4-4v-2M16 5h-6a4 4 0 0 0-4 4v2" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
    review: (
      <>
        <path d="M3 12a9 9 0 1 0 2.6-6.3" />
        <path d="M3 4v5h5" />
      </>
    ),
    progress: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
    flag: (
      <>
        <path d="M5 21V4" />
        <path d="M5 4h12l-2 4 2 4H5" />
      </>
    ),
    pause: (
      <>
        <path d="M9 5v14M15 5v14" />
      </>
    ),
    play: <path d="M7 5l12 7-12 7V5z" />,
    exit: (
      <>
        <path d="M6 6l12 12M18 6L6 18" />
      </>
    ),
    mute: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M4 4l16 16" />
      </>
    ),
    check: <path d="M4 12l5 5L20 6" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

/** Avatar con iniciales, estilo expediente académico. */
export function InitialsAvatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-primary-soft font-display text-sm font-semibold text-primary ${className}`}
      aria-hidden
    >
      {initials}
    </span>
  );
}
