import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface/90 backdrop-blur-sm ${
        glow ? 'shadow-[0_0_40px_rgba(255,201,77,0.08)]' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`font-display text-sm uppercase tracking-[0.2em] text-dim ${className}`}>{children}</h2>
  );
}

export function Chip({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'star' | 'ok' | 'warn' | 'risk' | 'nova';
}) {
  const tones: Record<string, string> = {
    default: 'border-line text-dim',
    star: 'border-star/40 text-star',
    ok: 'border-ok/40 text-ok',
    warn: 'border-warn/40 text-warn',
    risk: 'border-risk/40 text-risk',
    nova: 'border-nova/40 text-nova',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

/**
 * Medidor de progreso con etiqueta. Las cuatro métricas (cobertura, dominio,
 * retención, readiness) se muestran SIEMPRE por separado (Especificación §6.4).
 */
export function Meter({
  label,
  value,
  hint,
  tone = 'star',
}: {
  label: string;
  value: number | null;
  hint?: string;
  tone?: 'star' | 'nova' | 'sky' | 'ok';
}) {
  const tones: Record<string, string> = {
    star: 'bg-star',
    nova: 'bg-nova',
    sky: 'bg-sky',
    ok: 'bg-ok',
  };
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-ink">{label}</span>
        <span className="font-display text-sm text-dim">
          {value === null ? '—' : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-raised">
        {value !== null && (
          <div
            className={`h-full rounded-full ${tones[tone]} transition-[width] duration-700`}
            style={{ width: `${Math.min(100, Math.round(value * 100))}%` }}
          />
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-dim">{hint}</p>}
    </div>
  );
}

export function StarLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-semibold tracking-tight ${className}`}>
      <span className="text-star">★</span> Starbiz<span className="text-dim">Academy</span>
    </span>
  );
}
