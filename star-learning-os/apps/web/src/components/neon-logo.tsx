let neonCounter = 0;

import { CometBody } from './comet';

interface Dot {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  delay: number;
  duration: number;
}

/** Puntos brillantes alrededor del emblema (deterministas para SSR). */
const DOTS: Dot[] = [
  { cx: 96, cy: 240, r: 4, fill: '#ff9ecf', delay: 0.3, duration: 3.6 },
  { cx: 62, cy: 430, r: 3.2, fill: '#7df9ff', delay: 1.8, duration: 4.2 },
  { cx: 120, cy: 520, r: 4.4, fill: '#ff5fa2', delay: 2.7, duration: 3.1 },
  { cx: 84, cy: 700, r: 3.6, fill: '#c4b5fd', delay: 1.1, duration: 4.6 },
  { cx: 170, cy: 740, r: 3, fill: '#7df9ff', delay: 3.3, duration: 3.9 },
  { cx: 664, cy: 210, r: 3.4, fill: '#c4b5fd', delay: 0.8, duration: 3.4 },
  { cx: 700, cy: 420, r: 4.2, fill: '#ff9ecf', delay: 2.2, duration: 4.4 },
  { cx: 648, cy: 560, r: 3, fill: '#7df9ff', delay: 3.8, duration: 3.2 },
  { cx: 690, cy: 690, r: 3.8, fill: '#ff5fa2', delay: 1.5, duration: 4.0 },
  { cx: 586, cy: 760, r: 3.2, fill: '#c4b5fd', delay: 2.9, duration: 3.7 },
  { cx: 250, cy: 120, r: 3, fill: '#7df9ff', delay: 0.5, duration: 4.3 },
  { cx: 470, cy: 96, r: 2.6, fill: '#ff9ecf', delay: 2.4, duration: 3.5 },
];

/**
 * Emblema neón de StarbizAcademy: cohete con llama viva despegando hacia la
 * Tierra, cometa de cola colorida, Saturnos, nubes y wordmark neón apilado.
 */
export function NeonLogo({
  className = 'w-64',
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  const uid = `neon-${(neonCounter += 1)}`;
  return (
    <svg
      viewBox={withWordmark ? '0 0 760 1080' : '0 0 760 920'}
      role="img"
      aria-label="StarbizAcademy: un cohete neón despega hacia la Tierra entre cometas"
      className={`neon-logo ${className}`}
    >
      <defs>
        <linearGradient id={`${uid}-purple`} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#f0a6ff" />
          <stop offset="55%" stopColor="#c26bff" />
          <stop offset="100%" stopColor="#8b3ff0" />
        </linearGradient>
        <linearGradient id={`${uid}-cyan`} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#8ffbff" />
          <stop offset="55%" stopColor="#2fe6ff" />
          <stop offset="100%" stopColor="#0d94ad" />
        </linearGradient>
        <linearGradient id={`${uid}-rocket`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="55%" stopColor="#ffb347" />
          <stop offset="100%" stopColor="#ff7a3c" />
        </linearGradient>
        <linearGradient id={`${uid}-flame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff3a0" />
          <stop offset="55%" stopColor="#ffc93c" />
          <stop offset="100%" stopColor="#ff6a2e" />
        </linearGradient>
        <radialGradient id={`${uid}-ocean`} cx="0.42" cy="0.36" r="0.75">
          <stop offset="0%" stopColor="#a5fbff" />
          <stop offset="45%" stopColor="#3ae9ff" />
          <stop offset="100%" stopColor="#1493b8" />
        </radialGradient>
        <linearGradient id={`${uid}-cloud`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efe9ff" />
          <stop offset="100%" stopColor="#b9a1ea" />
        </linearGradient>
        <clipPath id={`${uid}-globe`}>
          <circle cx="560" cy="248" r="100" />
        </clipPath>
      </defs>

      {/* Cometa del emblema: cruzando el cielo superior con deriva suave. */}
      <g transform="translate(280 140)">
        <g className="anim-comet-drift">
          <g transform="rotate(160) scale(0.95)">
            <CometBody color="#8fd8ff" />
          </g>
        </g>
      </g>

      {/* Tierra: océano luminoso, continentes en silueta girando, atmósfera. */}
      <g>
        <circle cx="560" cy="248" r="122" stroke={`url(#${uid}-cyan)`} strokeWidth="2.5" fill="none" opacity="0.5" style={{ filter: 'blur(2px)' }} />
        <circle cx="560" cy="248" r="112" fill={`url(#${uid}-ocean)`} opacity="0.55" style={{ filter: 'blur(12px)' }} />
        <circle cx="560" cy="248" r="104" fill={`url(#${uid}-ocean)`} />
        <g clipPath={`url(#${uid}-globe)`}>
          <g className="anim-planet" style={{ transformBox: 'view-box', transformOrigin: '560px 248px' }} fill="#0a4a66">
            <path d="M 505 190 q 22 -20 46 -12 q 26 6 22 26 q -4 18 -24 20 q -8 14 -22 10 q -18 -4 -24 -20 q -4 -14 2 -24 Z" />
            <path d="M 530 250 q 14 -6 22 4 q 8 10 2 24 q -6 16 -16 22 q -8 4 -12 -4 q -6 -14 -4 -28 q 2 -12 8 -18 Z" />
            <path d="M 590 240 q 16 -10 28 -2 q 14 8 10 24 q -4 16 -18 22 q -14 4 -22 -6 q -8 -12 -4 -24 q 2 -8 6 -14 Z" />
            <path d="M 585 205 q 10 -8 18 -3 q 8 5 4 13 q -5 8 -14 6 q -9 -2 -8 -16 Z" />
            <circle cx="618" cy="300" r="6" />
            <circle cx="502" cy="288" r="4.5" />
          </g>
        </g>
        <circle cx="560" cy="248" r="104" fill="none" stroke={`url(#${uid}-cyan)`} strokeWidth="7" style={{ filter: 'blur(1px)' }} />
        <circle cx="560" cy="248" r="104" fill="none" stroke="#ecfeff" strokeWidth="2.4" opacity="0.9" />
      </g>

      {/* Saturnos con anillo delante y detrás (la animación va en el grupo interno). */}
      <g transform="translate(148 636) rotate(-22)">
        <g className="anim-saturn">
          <ellipse rx="31" ry="8" stroke={`url(#${uid}-purple)`} strokeWidth="4" fill="none" opacity="0.9" />
          <circle r="16" fill="#2a0a24" stroke="#ff9ecf" strokeWidth="4" />
          <path d="M -31 0 A 31 8 0 0 0 31 0" stroke="#ff9ecf" strokeWidth="4" fill="none" />
        </g>
      </g>
      <g transform="translate(606 664) rotate(-18)">
        <g className="anim-saturn" style={{ animationDelay: '-3.4s' }}>
          <ellipse rx="25" ry="7" stroke={`url(#${uid}-purple)`} strokeWidth="3.5" fill="none" opacity="0.9" />
          <circle r="13" fill="#2a0a24" stroke="#ff5fa2" strokeWidth="3.5" />
          <path d="M -25 0 A 25 7 0 0 0 25 0" stroke="#ff5fa2" strokeWidth="3.5" fill="none" />
        </g>
      </g>

      {/* Nubes de despegue: capa oscura atrás, copetes claros delante. */}
      <ellipse cx="382" cy="896" rx="170" ry="22" fill="#7c3aed" opacity="0.3" style={{ filter: 'blur(10px)' }} />
      <g className="anim-clouds">
        <g fill="#8f76c9" opacity="0.85">
          <circle cx="276" cy="858" r="34" />
          <circle cx="330" cy="840" r="42" />
          <circle cx="392" cy="846" r="38" />
          <circle cx="452" cy="842" r="40" />
          <circle cx="500" cy="858" r="30" />
          <ellipse cx="386" cy="886" rx="150" ry="20" />
        </g>
        <g fill={`url(#${uid}-cloud)`}>
          <circle cx="272" cy="850" r="30" />
          <circle cx="314" cy="828" r="40" />
          <circle cx="360" cy="838" r="34" />
          <circle cx="408" cy="828" r="42" />
          <circle cx="452" cy="840" r="34" />
          <circle cx="496" cy="852" r="26" />
          <circle cx="340" cy="862" r="36" />
          <circle cx="396" cy="866" r="38" />
          <circle cx="446" cy="862" r="30" />
        </g>
      </g>

      {/* Flash de ignición sobre las nubes al despegar. */}
      <ellipse
        cx="380"
        cy="848"
        rx="120"
        ry="26"
        fill="#fff3c9"
        className="anim-flash"
        style={{ filter: 'blur(9px)' }}
      />

      {/* Cohete con balanceo; llama viva entrando a las nubes. */}
      <g className="anim-rocket">
        <g className="anim-flame">
          <path d="M 380 620 C 358 652 356 688 368 716 C 360 742 372 764 380 792 C 388 764 400 742 392 716 C 404 688 402 652 380 620 Z" fill={`url(#${uid}-flame)`} opacity="0.95" style={{ filter: 'blur(1.5px)' }} />
          <path d="M 380 630 C 368 654 366 684 374 708 C 368 728 374 748 380 770 C 386 748 392 728 386 708 C 394 684 392 654 380 630 Z" fill="#ffe98a" />
          <path d="M 380 642 C 372 662 372 690 380 718 C 388 690 388 662 380 642 Z" fill="#fffbe8" />
          <ellipse cx="380" cy="812" rx="7" ry="13" fill="#ffc93c" opacity="0.5" />
          <ellipse cx="380" cy="836" rx="4.5" ry="8" fill="#ffc93c" opacity="0.3" />
        </g>
        <g>
          <path
            d="M 380 168 C 352 210 328 252 328 320 L 328 560 Q 328 596 364 600 L 396 600 Q 432 596 432 560 L 432 320 C 432 252 408 210 380 168 Z"
            fill="#0b1026" fillOpacity="0.72" stroke={`url(#${uid}-rocket)`} strokeWidth="7" strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 12px rgba(255,179,71,0.45))' }}
          />
          <path d="M 332 300 Q 380 318 428 300" stroke={`url(#${uid}-rocket)`} strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M 380 452 L 380 556" stroke={`url(#${uid}-rocket)`} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
          <circle cx="380" cy="410" r="36" fill="#07182b" stroke={`url(#${uid}-rocket)`} strokeWidth="6" />
          <circle cx="380" cy="410" r="22" fill="#0b2a3d" stroke={`url(#${uid}-cyan)`} strokeWidth="4.5" style={{ filter: 'drop-shadow(0 0 8px rgba(47,230,255,0.6))' }} />
          <path d="M 328 500 C 296 522 282 560 284 610 L 288 634 L 318 606 C 324 600 328 592 328 582" stroke={`url(#${uid}-rocket)`} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 432 500 C 464 522 478 560 476 610 L 472 634 L 442 606 C 436 600 432 592 432 582" stroke={`url(#${uid}-rocket)`} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 356 600 L 404 600 L 402 622 L 358 622 Z" fill="#2a1650" stroke={`url(#${uid}-purple)`} strokeWidth="5" strokeLinejoin="round" />
        </g>
      </g>

      {/* Puntos brillantes con parpadeo escalonado. */}
      {DOTS.map((dot) => (
        <circle
          key={`${dot.cx}-${dot.cy}`}
          cx={dot.cx}
          cy={dot.cy}
          r={dot.r}
          fill={dot.fill}
          style={{
            filter: `drop-shadow(0 0 6px ${dot.fill})`,
            animation: `twinkle ${dot.duration}s ease-in-out ${dot.delay}s infinite`,
          }}
        />
      ))}

      {/* Wordmark apilado: halo rosa detrás, tubo cian delante. */}
      {withWordmark && (
        <g className="anim-neon-hum">
          <g
            fill="none" stroke="#ff4fa8" strokeWidth="9" opacity="0.5"
            style={{ filter: 'blur(12px)' }}
            fontFamily="Onest, ui-sans-serif, sans-serif" fontWeight="800" fontSize="84" textAnchor="middle" letterSpacing="4"
          >
            <text x="380" y="982">STARBIZ</text>
            <text x="380" y="1062">ACADEMY</text>
          </g>
          <g
            fill="#d9fdff" stroke={`url(#${uid}-cyan)`} strokeWidth="3"
            style={{ filter: 'drop-shadow(0 0 10px rgba(47,230,255,0.55))' }}
            fontFamily="Onest, ui-sans-serif, sans-serif" fontWeight="800" fontSize="84" textAnchor="middle" letterSpacing="4"
          >
            <text x="380" y="982">STARBIZ</text>
            <text x="380" y="1062">ACADEMY</text>
          </g>
        </g>
      )}
    </svg>
  );
}
