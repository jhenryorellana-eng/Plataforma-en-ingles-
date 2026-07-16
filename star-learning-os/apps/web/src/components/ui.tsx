import type { ReactNode } from 'react';

/** Tarjeta iOS: blanca, sin borde, esquinas continuas. */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`}>
      {children}
    </div>
  );
}

/** Grupo de filas estilo Ajustes: tarjeta con separadores hairline. */
export function Group({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] [&>*+*]:border-t [&>*+*]:border-line ${className}`}
    >
      {children}
    </div>
  );
}

/** Encabezado de sección de lista agrupada (footnote gris, como iOS). */
export function SectionHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`px-5 pb-2 text-[13px] font-medium uppercase tracking-wide text-dim ${className}`}>
      {children}
    </h2>
  );
}

/** Fila de lista iOS: icono en tesela, título/subtítulo, valor y chevron opcionales. */
export function Row({
  icon,
  iconColor = 'bg-primary',
  title,
  subtitle,
  trailing,
  chevron = false,
}: {
  icon?: IconName;
  iconColor?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
}) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-3">
      {icon && <IconTile name={icon} color={iconColor} />}
      <div className="min-w-0 flex-1">
        <p className="text-[16px] leading-snug text-ink">{title}</p>
        {subtitle && <p className="mt-0.5 text-[13px] leading-snug text-dim">{subtitle}</p>}
      </div>
      {trailing && <div className="shrink-0 text-[15px] text-dim">{trailing}</div>}
      {chevron && <Icon name="chevron" className="size-4 shrink-0 text-[#c7c7cc]" />}
    </div>
  );
}

/** Tesela de icono con degradado de marca (estructura Ajustes, identidad Starbiz). */
const TILE_GRADIENTS: Record<string, string> = {
  'bg-primary': 'linear-gradient(135deg,#8f8dff,#4b49d6)',
  'bg-blue': 'linear-gradient(135deg,#57a8ff,#0a6fe0)',
  'bg-teal': 'linear-gradient(135deg,#3fd2e6,#0f96ad)',
  'bg-gold': 'linear-gradient(135deg,#ffc25c,#f08a00)',
  'bg-ok': 'linear-gradient(135deg,#55d97e,#1d9c4b)',
  'bg-risk': 'linear-gradient(135deg,#ff7a70,#e02d22)',
  'bg-fill': 'linear-gradient(135deg,#d9d8ea,#b9b8cf)',
};

export function IconTile({ name, color = 'bg-primary' }: { name: IconName; color?: string }) {
  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-[9px] shadow-[0_2px_6px_rgba(23,23,43,0.18)]"
      style={{ backgroundImage: TILE_GRADIENTS[color] ?? TILE_GRADIENTS['bg-primary'] }}
    >
      <Icon name={name} className="size-4.5 text-white" />
    </span>
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
    default: 'bg-fill text-dim',
    gold: 'bg-gold-soft text-gold-deep',
    ok: 'bg-ok-soft text-ok-deep',
    warn: 'bg-warn-soft text-gold-deep',
    risk: 'bg-risk-soft text-risk',
    primary: 'bg-primary-soft text-primary',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** Barra fina iOS (usada en filas de consumo). */
export function Meter({
  label,
  value,
  hint,
  tone = 'primary',
}: {
  label: string;
  value: number | null;
  hint?: string;
  tone?: 'primary' | 'gold' | 'ok' | 'ink' | 'blue' | 'teal';
}) {
  const tones: Record<string, string> = {
    primary: 'bg-primary',
    gold: 'bg-gold',
    ok: 'bg-ok',
    ink: 'bg-ink',
    blue: 'bg-blue',
    teal: 'bg-teal',
  };
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-4">
        <span className="text-[15px] text-ink">{label}</span>
        <span className="text-[15px] font-semibold tabular-nums text-ink">
          {value === null ? '—' : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <div className="h-[5px] overflow-hidden rounded-full bg-fill">
        {value !== null && (
          <div
            className={`h-full rounded-full ${tones[tone]} transition-[width] duration-700`}
            style={{ width: `${Math.min(100, Math.round(value * 100))}%` }}
          />
        )}
      </div>
      {hint && <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{hint}</p>}
    </div>
  );
}

let ringGradientCounter = 0;

/** Anillo de progreso estilo Actividad de Apple, con trazo degradado opcional. */
export function Ring({
  value,
  size = 56,
  strokeWidth = 7,
  color = '#5e5ce6',
  colorTo,
  track = '#e8e7f2',
  children,
}: {
  value: number | null;
  size?: number;
  strokeWidth?: number;
  color?: string;
  colorTo?: string;
  track?: string;
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, value ?? 0));
  const offset = circumference * (1 - clamped);
  const gradientId = colorTo ? `ring-grad-${(ringGradientCounter += 1)}` : null;
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {gradientId && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={strokeWidth} />
        <circle
          className="ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={gradientId ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {children && <span className="absolute inset-0 flex items-center justify-center">{children}</span>}
    </span>
  );
}

/** Cuatro anillos concéntricos: cobertura, dominio, retención, readiness. */
export function RingCluster({
  rings,
  size = 168,
}: {
  rings: Array<{ value: number | null; color: string; colorTo?: string }>;
  size?: number;
}) {
  const strokeWidth = 13;
  const gap = 3;
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {rings.map((ring, index) => {
        const ringSize = size - index * 2 * (strokeWidth + gap);
        return (
          <span key={index} className="absolute inset-0 flex items-center justify-center">
            <Ring
              value={ring.value}
              size={ringSize}
              strokeWidth={strokeWidth}
              color={ring.color}
              colorTo={ring.colorTo}
            />
          </span>
        );
      })}
    </span>
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

/** Icono de app (squircle degradado), como en un onboarding de Apple. */
export function AppIcon({ className = 'size-16' }: { className?: string }) {
  return (
    <span
      className={`grad-brand inline-flex items-center justify-center rounded-[24%] shadow-[0_10px_28px_rgba(94,92,230,0.4)] ring-1 ring-white/40 ${className}`}
    >
      <StarMark className="size-1/2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
    </span>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <AppIcon className="size-6" />
      <span className="text-[17px] font-bold tracking-tight text-ink">StarbizAcademy</span>
    </span>
  );
}

export type IconName =
  | 'today'
  | 'route'
  | 'mic'
  | 'review'
  | 'progress'
  | 'shield'
  | 'flag'
  | 'pause'
  | 'play'
  | 'exit'
  | 'mute'
  | 'check'
  | 'arrow'
  | 'chevron'
  | 'book'
  | 'pencil';

/** Iconografía propia en SVG (trazo 1.8, sin librerías). */
export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    today: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="3" />
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
    chevron: <path d="M9 5l7 7-7 7" />,
    book: (
      <>
        <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" />
        <path d="M4 19a2 2 0 0 1 2-2h13" />
      </>
    ),
    pencil: (
      <>
        <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
        <path d="M13.5 6.5l3 3" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

/** Avatar con iniciales y anillo de marca. */
export function InitialsAvatar({ name, className = '' }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span
      className={`grad-brand inline-flex size-11 shrink-0 items-center justify-center rounded-full p-[2px] ${className}`}
      aria-hidden
    >
      <span className="flex size-full items-center justify-center rounded-full bg-surface text-[14px] font-bold text-primary">
        {initials}
      </span>
    </span>
  );
}
