import type { AvatarConfig } from '@star/contracts';
import { shade } from './color';

function Hoodie() {
  const base = '#5e5ce6';
  return (
    <g>
      <path d="M 36 100 C 36 86 47 82 60 82 C 73 82 84 86 84 100 C 78 93 70 90 60 90 C 50 90 42 93 36 100 Z" fill={shade(base, -0.28)} />
      <path d="M 26 120 C 26 101 38 93 60 93 C 82 93 94 101 94 120 Z" fill={base} />
      <path d="M 50 93 Q 60 100 70 93" fill="none" stroke={shade(base, -0.28)} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M 45 111 Q 60 116 75 111" fill="none" stroke={shade(base, -0.22)} strokeWidth={1.8} strokeLinecap="round" />
      <g stroke="#d9d8ea" strokeWidth={2.2} strokeLinecap="round">
        <path d="M 56.5 98 L 55.5 108" />
        <path d="M 63.5 98 L 64.5 108" />
      </g>
      <circle cx={55.4} cy={109} r={1.4} fill="#d9d8ea" />
      <circle cx={64.6} cy={109} r={1.4} fill="#d9d8ea" />
    </g>
  );
}

function Tee() {
  const base = '#17b8cd';
  return (
    <g>
      <path d="M 26 120 C 26 101 38 93 60 93 C 82 93 94 101 94 120 Z" fill={base} />
      <path d="M 49 93 Q 60 101 71 93" fill="none" stroke={shade(base, -0.3)} strokeWidth={3.4} strokeLinecap="round" />
      <path d="M 33 102 Q 35 97 40 95" fill="none" stroke={shade(base, -0.16)} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M 87 102 Q 85 97 80 95" fill="none" stroke={shade(base, -0.16)} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M 60 104 C 60.5 107 62 108.5 65 109 C 62 109.5 60.5 111 60 114 C 59.5 111 58 109.5 55 109 C 58 108.5 59.5 107 60 104 Z" fill="#ffffff" opacity={0.85} />
    </g>
  );
}

function SpaceSuit() {
  return (
    <g>
      <path d="M 26 120 C 26 101 38 93 60 93 C 82 93 94 101 94 120 Z" fill="#e9edf5" />
      <path d="M 44 95 Q 39 100 37.5 106" fill="none" stroke="#c3cdd9" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M 76 95 Q 81 100 82.5 106" fill="none" stroke="#c3cdd9" strokeWidth={1.6} strokeLinecap="round" />
      <ellipse cx={60} cy={93.5} rx={15} ry={5} fill="none" stroke="#aab6cc" strokeWidth={4} />
      <rect x={48} y={103} width={24} height={13} rx={3.5} fill="#ccd6e6" stroke="#aab6cc" strokeWidth={1.2} />
      <circle cx={53.5} cy={108} r={1.6} fill="#2fbf5f" />
      <circle cx={60} cy={108} r={1.6} fill="#ff9f0a" />
      <circle cx={66.5} cy={108} r={1.6} fill="#0a84ff" />
      <path d="M 51.5 112.5 H 68.5" stroke="#aab6cc" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

/** Cuello (sombra de la piel) + torso con el outfit elegido. */
export function Body({ config }: { config: AvatarConfig }) {
  return (
    <g>
      <rect x={54} y={74} width={12} height={20} rx={5} fill={shade(config.skin, -0.16)} />
      {config.outfit === 'hoodie' && <Hoodie />}
      {config.outfit === 'tee' && <Tee />}
      {config.outfit === 'space' && <SpaceSuit />}
    </g>
  );
}
