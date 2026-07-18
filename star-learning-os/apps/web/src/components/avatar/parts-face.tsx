import type { AvatarConfig } from '@star/contracts';
import { shade } from './color';

type FaceShape = AvatarConfig['faceShape'];
type EyesKind = AvatarConfig['eyes'];
type MouthKind = AvatarConfig['mouth'];

/** Semiancho de la cabeza por forma: ancla orejas al borde real de cada rostro. */
const EAR_HALF: Record<FaceShape, number> = { round: 26, oval: 23, square: 22 };

const INK = '#26243a';

function HeadShape({ shape, skin }: { shape: FaceShape; skin: string }) {
  if (shape === 'oval') return <ellipse cx={60} cy={57} rx={23} ry={28} fill={skin} />;
  if (shape === 'square') {
    return (
      <path
        d="M 38 46 C 38 36 46 31 60 31 C 74 31 82 36 82 46 C 82 58 81 68 76 74 C 71 80 66 82 60 82 C 54 82 49 80 44 74 C 39 68 38 58 38 46 Z"
        fill={skin}
      />
    );
  }
  return <circle cx={60} cy={56} r={26} fill={skin} />;
}

function Ears({ shape, skin, species }: { shape: FaceShape; skin: string; species: AvatarConfig['species'] }) {
  const half = EAR_HALF[shape];
  if (species === 'alien') {
    return (
      <g fill={skin}>
        <path d={`M ${60 - half + 1} 53 Q ${60 - half - 6} 49 ${60 - half - 7} 57 Q ${60 - half - 3} 59.5 ${60 - half + 1} 60 Z`} />
        <path d={`M ${60 + half - 1} 53 Q ${60 + half + 6} 49 ${60 + half + 7} 57 Q ${60 + half + 3} 59.5 ${60 + half - 1} 60 Z`} />
      </g>
    );
  }
  const inner = shade(skin, -0.14);
  return (
    <g>
      <ellipse cx={60 - half} cy={58} rx={4.6} ry={6.2} fill={skin} />
      <ellipse cx={60 + half} cy={58} rx={4.6} ry={6.2} fill={skin} />
      <ellipse cx={60 - half + 1.4} cy={58} rx={1.9} ry={3} fill={inner} />
      <ellipse cx={60 + half - 1.4} cy={58} rx={1.9} ry={3} fill={inner} />
    </g>
  );
}

function Eyes({ kind, skin }: { kind: EyesKind; skin: string }) {
  if (kind === 'happy') {
    return (
      <g fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round">
        <path d="M 44.5 53.5 Q 49 59 53.5 53.5" />
        <path d="M 66.5 53.5 Q 71 59 76.5 53.5" />
      </g>
    );
  }
  if (kind === 'big') {
    return (
      <g>
        <circle cx={49} cy={55} r={5.6} fill="#ffffff" />
        <circle cx={71} cy={55} r={5.6} fill="#ffffff" />
        <circle cx={49.4} cy={55.6} r={2.9} fill={INK} />
        <circle cx={71.4} cy={55.6} r={2.9} fill={INK} />
        <circle cx={48.3} cy={54.2} r={1.1} fill="#ffffff" />
        <circle cx={70.3} cy={54.2} r={1.1} fill="#ffffff" />
      </g>
    );
  }
  if (kind === 'alien') {
    return (
      <g>
        <g transform="rotate(7 49 55.5)">
          <ellipse cx={49} cy={55.5} rx={5} ry={7.6} fill={INK} />
          <ellipse cx={47.5} cy={52.5} rx={1.8} ry={2.7} fill="#ffffff" opacity={0.85} />
          <circle cx={50.8} cy={58.6} r={0.9} fill="#ffffff" opacity={0.5} />
        </g>
        <g transform="rotate(-7 71 55.5)">
          <ellipse cx={71} cy={55.5} rx={5} ry={7.6} fill={INK} />
          <ellipse cx={69.5} cy={52.5} rx={1.8} ry={2.7} fill="#ffffff" opacity={0.85} />
          <circle cx={72.8} cy={58.6} r={0.9} fill="#ffffff" opacity={0.5} />
        </g>
      </g>
    );
  }
  // normal: puntos oscuros con brillo + párpado superior sutil
  return (
    <g>
      <ellipse cx={49} cy={55} rx={3} ry={3.6} fill={INK} />
      <ellipse cx={71} cy={55} rx={3} ry={3.6} fill={INK} />
      <circle cx={48} cy={53.8} r={1} fill="#ffffff" opacity={0.9} />
      <circle cx={70} cy={53.8} r={1} fill="#ffffff" opacity={0.9} />
      <g fill="none" stroke={shade(skin, -0.32)} strokeWidth={1.6} strokeLinecap="round" opacity={0.55}>
        <path d="M 44.6 51.6 Q 49 49.4 53.4 51.6" />
        <path d="M 66.6 51.6 Q 71 49.4 75.4 51.6" />
      </g>
    </g>
  );
}

function Brows({ hairColor }: { hairColor: string }) {
  return (
    <g fill="none" stroke={shade(hairColor, -0.22)} strokeWidth={2.2} strokeLinecap="round" opacity={0.85}>
      <path d="M 44.5 46.6 Q 49 44 53.5 46.6" />
      <path d="M 66.5 46.6 Q 71 44 75.5 46.6" />
    </g>
  );
}

function Mouth({ kind }: { kind: MouthKind }) {
  if (kind === 'grin') {
    return (
      <g>
        <path d="M 50.5 67.5 Q 60 71 69.5 67.5 Q 68.2 78.5 60 79 Q 51.8 78.5 50.5 67.5 Z" fill="#7c3f3f" />
        <path d="M 52.6 68.4 Q 60 71 67.4 68.4 Q 66.6 72 60 72.4 Q 53.4 72 52.6 68.4 Z" fill="#ffffff" />
      </g>
    );
  }
  if (kind === 'calm') {
    return <path d="M 54 69.5 Q 60 72.2 66 69.5" fill="none" stroke="#8c4a44" strokeWidth={2.4} strokeLinecap="round" />;
  }
  return <path d="M 52.5 68.5 Q 60 75.8 67.5 68.5" fill="none" stroke="#8c4a44" strokeWidth={2.6} strokeLinecap="round" />;
}

/** Cabeza + orejas (las orejas van bajo el pelo en la pila de capas). */
export function Head({ config }: { config: AvatarConfig }) {
  return (
    <g>
      <HeadShape shape={config.faceShape} skin={config.skin} />
      <Ears shape={config.faceShape} skin={config.skin} species={config.species} />
    </g>
  );
}

/** Rasgos sobre la cara: rubor, ojos, cejas, nariz y boca. */
export function Features({ config }: { config: AvatarConfig }) {
  return (
    <g>
      <g fill="#ff8fa3" opacity={0.3}>
        <ellipse cx={43} cy={64} rx={3.8} ry={2.2} />
        <ellipse cx={77} cy={64} rx={3.8} ry={2.2} />
      </g>
      <Eyes kind={config.eyes} skin={config.skin} />
      {config.eyes !== 'alien' && <Brows hairColor={config.hairColor} />}
      <path
        d="M 60 60.5 Q 58.8 63.6 60.6 64.2"
        fill="none"
        stroke={shade(config.skin, -0.26)}
        strokeWidth={1.7}
        strokeLinecap="round"
        opacity={0.8}
      />
      <Mouth kind={config.mouth} />
    </g>
  );
}
