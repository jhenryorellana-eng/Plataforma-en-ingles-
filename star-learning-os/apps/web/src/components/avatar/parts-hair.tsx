import type { AvatarConfig } from '@star/contracts';
import { shade } from './color';

type HairStyle = AvatarConfig['hairStyle'];

/** Nube de rizos: círculos [cx, cy, r] unidos alrededor de la coronilla. */
const CURLS: Array<[number, number, number]> = [
  [40.3, 38.8, 7],
  [46.5, 29.9, 7],
  [56.4, 25.3, 7.5],
  [60, 24, 7],
  [67.2, 26.2, 7.5],
  [76.1, 32.5, 7],
  [80.7, 42.4, 6.5],
  [36.5, 47, 6],
  [83.5, 47, 6],
  [48, 35, 6.5],
  [64, 34, 6.5],
];

/** Pelo por estilo. Geometría fija anclada a la cabeza redonda (la mayor). */
export function Hair({ style, color }: { style: HairStyle; color: string }) {
  if (style === 'none') return null;
  const shine = shade(color, 0.35);
  const dark = shade(color, -0.2);

  if (style === 'short') {
    return (
      <g fill={color}>
        <path d="M 33 51 C 32 31 44 22 60 22 C 76 22 88 31 87 51 C 85 44 82 40 78 41 C 79 36 73 33 69 36 C 67 31 60 30 57 33 C 52 30 46 33 46 38 C 40 37 35 44 33 51 Z" />
        <path d="M 41 30 Q 51 24.5 62 26" fill="none" stroke={shine} strokeWidth={2.4} strokeLinecap="round" opacity={0.4} />
      </g>
    );
  }

  if (style === 'spiky') {
    return (
      <g fill={color}>
        <path d="M 33 51 L 35.5 37 L 41.5 29.5 L 44.5 36.5 L 49.5 25.5 L 54 33.5 L 59.5 22.5 L 64 32.5 L 70 24.5 L 74 33.5 L 81 28.5 L 84 38 L 87 51 C 84 44 81 41 77 42 C 78 37 72 35 68 38 C 64 34 57 34 54 37 C 49 35 44 38 44 42 C 39 42 35 46 33 51 Z" />
      </g>
    );
  }

  if (style === 'long') {
    return (
      <g fill={color}>
        <path d="M 31 93 C 27 58 30 27 60 22 C 90 27 93 58 89 93 C 85 97 81 95 80 90 C 82 68 82 50 78 42 C 74 45 70 39 66 40 C 63 35 57 35 54 40 C 50 39 46 45 42 42 C 38 50 38 68 40 90 C 39 95 35 97 31 93 Z" />
        <path d="M 35.5 56 C 34.5 68 34.5 80 36 89" fill="none" stroke={shine} strokeWidth={2.2} strokeLinecap="round" opacity={0.35} />
        <path d="M 84.5 56 C 85.5 68 85.5 80 84 89" fill="none" stroke={shine} strokeWidth={2.2} strokeLinecap="round" opacity={0.35} />
      </g>
    );
  }

  if (style === 'curly') {
    return (
      <g fill={color}>
        {CURLS.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
        <circle cx={52} cy={28} r={2.2} fill={shine} opacity={0.45} />
        <circle cx={70} cy={30} r={1.7} fill={shine} opacity={0.45} />
      </g>
    );
  }

  // buns: dos moños + base de pelo corto
  return (
    <g fill={color}>
      <circle cx={36} cy={25} r={8.5} />
      <circle cx={84} cy={25} r={8.5} />
      <circle cx={36} cy={26.5} r={3.6} fill={dark} />
      <circle cx={84} cy={26.5} r={3.6} fill={dark} />
      <path d="M 34 50 C 33 31 45 23 60 23 C 75 23 87 31 86 50 C 84 44 81 41 77 42 C 78 37 72 35 68 38 C 66 33 59 32 56 35 C 51 32 45 35 45 40 C 40 39 36 44 34 50 Z" />
    </g>
  );
}
