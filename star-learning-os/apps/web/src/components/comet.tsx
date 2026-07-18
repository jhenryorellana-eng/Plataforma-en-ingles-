import type { CSSProperties } from 'react';

let cometCounter = 0;

/** Destellos fijos en la estela (deterministas para SSR). */
const TAIL_SPARKS = [
  { cx: 190, cy: 42, r: 1.0, delay: 0.4 },
  { cx: 150, cy: 44, r: 0.9, delay: 1.6 },
  { cx: 112, cy: 41, r: 0.8, delay: 2.7 },
  { cx: 76, cy: 43, r: 0.7, delay: 1.0 },
  { cx: 44, cy: 42, r: 0.6, delay: 2.1 },
];

function CometShapes({ uid, color }: { uid: string; color: string }) {
  return (
    <>
      <defs>
        <radialGradient id={`${uid}-coma`}>
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="38%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-tail`} x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="22%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-fan`} x1="100%" y1="0%" x2="0%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Cola de polvo: abanico amplio y difuso que se abre desde el núcleo. */}
      <path
        className="anim-tail"
        d="M 250 45 C 196 26 120 22 14 42 C 120 46 196 50 250 45 Z"
        fill={`url(#${uid}-fan)`}
        opacity="0.5"
        style={{ filter: 'blur(3px)' }}
      />
      {/* Cola iónica: tres filamentos sedosos y finos. */}
      <path
        className="anim-tail"
        d="M 252 43 C 188 39 96 36 8 40"
        stroke={`url(#${uid}-tail)`} strokeWidth="1.8" fill="none" strokeLinecap="round"
        style={{ filter: 'blur(0.7px)' }}
      />
      <path
        className="anim-tail"
        d="M 252 47 C 190 46 98 46 16 50"
        stroke={`url(#${uid}-tail)`} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.75"
        style={{ filter: 'blur(0.7px)' }}
      />
      <path
        className="anim-tail"
        d="M 250 41 C 196 33 120 30 30 33"
        stroke={`url(#${uid}-tail)`} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.55"
        style={{ filter: 'blur(0.7px)' }}
      />
      {TAIL_SPARKS.map((spark) => (
        <circle
          key={spark.cx}
          cx={spark.cx}
          cy={spark.cy}
          r={spark.r}
          fill="#ffffff"
          style={{ animation: `twinkle 2.8s ease-in-out ${spark.delay}s infinite` }}
        />
      ))}
      {/* Núcleo puntual con coma pequeña: la cola es la protagonista. */}
      <circle cx="252" cy="45" r="11" fill={`url(#${uid}-coma)`} />
      <circle
        cx="252"
        cy="45"
        r="2.4"
        fill="#ffffff"
        style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.95))' }}
      />
    </>
  );
}

/** Cometa como SVG independiente (cielo): cabeza a la derecha, cola colorida atrás. */
export function Comet({
  color = '#7df9ff',
  className = '',
  style,
}: {
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const uid = `comet-${(cometCounter += 1)}`;
  return (
    <svg viewBox="0 0 280 90" aria-hidden className={className} style={style}>
      <CometShapes uid={uid} color={color} />
    </svg>
  );
}

/** Cometa como grupo dentro de otro SVG (emblema). */
export function CometBody({ color = '#7df9ff' }: { color?: string }) {
  const uid = `comet-${(cometCounter += 1)}`;
  return (
    <g>
      <CometShapes uid={uid} color={color} />
    </g>
  );
}
