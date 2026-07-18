function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLORS = ['#7c7aff', '#2fe6ff', '#ffd76a', '#ff9ecf', '#3dd771', '#ffffff'];
const PIECES = 42;

interface Piece {
  left: number;
  color: string;
  dx: number;
  rot: number;
  dur: number;
  delay: number;
  round: boolean;
}

function buildPieces(): Piece[] {
  const rand = mulberry32(20260717);
  return Array.from({ length: PIECES }, (_, index) => ({
    left: rand() * 100,
    color: COLORS[index % COLORS.length],
    dx: (rand() - 0.5) * 260,
    rot: 360 + rand() * 540,
    dur: 2.3 + rand() * 1.6,
    delay: rand() * 0.45,
    round: rand() > 0.6,
  }));
}

const CONFETTI = buildPieces();

/** Lluvia de confetti de marca (GPU: solo transform/opacity). */
export function Confetti() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          className={`confetti-piece absolute top-0 block ${piece.round ? 'size-2 rounded-full' : 'h-2.5 w-2 rounded-[2px]'}`}
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            ['--dx' as string]: `${piece.dx}px`,
            ['--rot' as string]: `${piece.rot}deg`,
            ['--dur' as string]: `${piece.dur}s`,
            ['--delay' as string]: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
