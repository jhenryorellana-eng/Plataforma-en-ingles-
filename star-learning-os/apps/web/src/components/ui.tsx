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
      className={`relative rounded-2xl border border-line bg-surface/90 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_24px_rgba(0,0,0,0.25)] ${className}`}
    >
      {accent && (
        <span
          aria-hidden
          className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-primary via-cyan to-transparent"
        />
      )}
      {children}
    </div>
  );
}

/** Etiqueta de sección estilo consola: monoespaciada, mínima. */
export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-mono text-[10px] uppercase tracking-[0.22em] text-dim ${className}`}>
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
    default: 'border-line bg-mist/70 text-dim',
    gold: 'border-gold/40 bg-gold-soft text-gold-deep',
    ok: 'border-ok/40 bg-ok-soft text-ok',
    warn: 'border-warn/40 bg-warn-soft text-warn',
    risk: 'border-risk/40 bg-risk-soft text-risk',
    primary: 'border-primary/40 bg-primary-soft text-[#b6abff]',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Medidor de telemetría. Las cuatro métricas (cobertura, dominio, retención,
 * readiness) SIEMPRE separadas (Especificación §6.4).
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
    primary: 'bg-gradient-to-r from-primary to-cyan',
    gold: 'bg-gradient-to-r from-gold to-gold-deep',
    ok: 'bg-ok',
    ink: 'bg-dim',
  };
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <span className="text-sm text-ink">{label}</span>
        <span className="font-mono text-sm font-medium tabular-nums text-ink">
          {value === null ? '—' : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-mist">
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

/** Estrella de cuatro puntas: la marca STAR. */
export function StarMark({ className = 'size-4 text-primary' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2c.6 5.2 4.8 9.4 10 10-5.2.6-9.4 4.8-10 10-.6-5.2-4.8-9.4-10-10 5.2-.6 9.4-4.8 10-10z" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan shadow-[0_0_16px_rgba(124,108,255,0.45)]">
        <StarMark className="size-4 text-white" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        Starbiz<span className="text-gradient">Academy</span>
      </span>
    </span>
  );
}

/** Iconografía propia en SVG (trazo 1.75, sin librerías). */
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

/** Avatar con iniciales y anillo de degradado firma. */
export function InitialsAvatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan p-px ${className}`}
      aria-hidden
    >
      <span className="flex size-full items-center justify-center rounded-full bg-surface font-mono text-xs font-medium text-ink">
        {initials}
      </span>
    </span>
  );
}
