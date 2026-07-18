import { Comet } from './comet';

const SKY_WIDTH = 1440;
const SKY_HEIGHT = 900;

interface Star {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  delay: number;
  duration: number;
}

interface HeroStar extends Star {
  scale: number;
}

/** PRNG determinista: el mismo cielo en servidor y cliente (sin hydration mismatch). */
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

const TINTS = ['#ffffff', '#ffffff', '#cfe9ff', '#bffbff', '#ffd6f2', '#e7ddff'];

function scatter(rand: () => number, count: number, rMin: number, rMax: number): Star[] {
  return Array.from({ length: count }, () => ({
    cx: Math.round(rand() * SKY_WIDTH),
    cy: Math.round(rand() * SKY_HEIGHT),
    r: rMin + rand() * (rMax - rMin),
    fill: TINTS[Math.floor(rand() * TINTS.length)],
    delay: rand() * 7,
    duration: 2.2 + rand() * 4.2,
  }));
}

/** Franja galáctica diagonal: microestrellas agrupadas alrededor de la banda. */
function band(rand: () => number, count: number): Star[] {
  return Array.from({ length: count }, () => {
    const t = rand();
    const spread = (rand() - 0.5) * (90 + rand() * 190);
    const x = 120 + t * 1240;
    const y = 780 - t * 660;
    const nx = -(-660) / 1400;
    const ny = 1240 / 1400;
    return {
      cx: Math.round(x + nx * spread),
      cy: Math.round(y + ny * spread),
      r: 0.4 + rand() * 0.9,
      fill: TINTS[Math.floor(rand() * TINTS.length)],
      delay: rand() * 7,
      duration: 2.6 + rand() * 3.6,
    };
  });
}

const rand = mulberry32(20260717);
const FAR_STARS = scatter(rand, 210, 0.4, 0.9);
const MID_STARS = scatter(rand, 120, 0.8, 1.5);
const NEAR_STARS = scatter(rand, 46, 1.4, 2.3);
const BAND_STARS = band(rand, 130);
const HERO_STARS: HeroStar[] = scatter(rand, 9, 1.6, 2.4).map((star) => ({
  ...star,
  scale: 1 + rand() * 1.2,
}));

function StarLayer({ stars, twinkle }: { stars: Star[]; twinkle: boolean }) {
  return (
    <>
      {stars.map((star, index) => (
        <circle
          key={index}
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          fill={star.fill}
          style={
            twinkle
              ? { animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite` }
              : { opacity: 0.55 }
          }
        />
      ))}
    </>
  );
}

/** Cielo profundo del login: parallax de 3 capas, franja galáctica, nebulosas y fugaces. */
export function SpaceBackground() {
  return (
    <div aria-hidden className="space-sky pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(1300px 860px at 76% -12%, rgba(63,32,120,0.55) 0%, transparent 58%),' +
            'radial-gradient(1100px 760px at 4% 112%, rgba(16,40,90,0.6) 0%, transparent 55%),' +
            'linear-gradient(180deg, #03040f 0%, #070a24 48%, #0d0926 100%)',
        }}
      />

      {/* Franja galáctica: bruma suave + polvo estelar agrupado. */}
      <div
        className="absolute left-[-12%] top-[38%] h-[420px] w-[150%] opacity-[0.16]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #b7a8ff 28%, #8fd8ff 52%, #ffb7e8 74%, transparent 100%)',
          filter: 'blur(46px)',
          transform: 'rotate(-27deg)',
        }}
      />
      <svg
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${SKY_WIDTH} ${SKY_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ animation: 'stars-drift-b 70s ease-in-out infinite alternate' }}
      >
        <StarLayer stars={BAND_STARS} twinkle />
      </svg>

      {/* Nebulosas de marca: violeta, magenta y cian. */}
      <div
        className="absolute -left-40 top-[16%] size-[40rem] rounded-full opacity-30 blur-[90px]"
        style={{
          background: 'radial-gradient(circle, #7c3aed 0%, transparent 62%)',
          animation: 'stars-drift-a 32s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute right-[-10rem] top-[-8rem] size-[34rem] rounded-full opacity-25 blur-[90px]"
        style={{
          background: 'radial-gradient(circle, #0ea5b7 0%, transparent 62%)',
          animation: 'stars-drift-b 27s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute bottom-[-12rem] left-[30%] size-[36rem] rounded-full opacity-20 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, #d946ef 0%, transparent 60%)',
          animation: 'stars-drift-a 38s ease-in-out infinite alternate',
        }}
      />

      {/* Parallax: lejos fijas y tenues, medio parpadeante, cerca brillante. */}
      <svg
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${SKY_WIDTH} ${SKY_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ animation: 'stars-drift-a 60s ease-in-out infinite alternate' }}
      >
        <StarLayer stars={FAR_STARS} twinkle={false} />
      </svg>
      <svg
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${SKY_WIDTH} ${SKY_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ animation: 'stars-drift-b 44s ease-in-out infinite alternate' }}
      >
        <StarLayer stars={MID_STARS} twinkle />
      </svg>
      <svg
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${SKY_WIDTH} ${SKY_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ animation: 'stars-drift-a 30s ease-in-out infinite alternate' }}
      >
        <StarLayer stars={NEAR_STARS} twinkle />
        {HERO_STARS.map((star, index) => (
          <g
            key={index}
            transform={`translate(${star.cx} ${star.cy}) scale(${star.scale})`}
            style={{ animation: `twinkle ${star.duration + 1.4}s ease-in-out ${star.delay}s infinite` }}
          >
            <circle r={star.r + 3.5} fill={star.fill} opacity="0.28" style={{ filter: 'blur(4px)' }} />
            <path
              d="M 0 -7 C 0.9 -1.6 1.6 -0.9 7 0 C 1.6 0.9 0.9 1.6 0 7 C -0.9 1.6 -1.6 0.9 -7 0 C -1.6 -0.9 -0.9 -1.6 0 -7 Z"
              fill={star.fill}
            />
          </g>
        ))}
      </svg>

      {/* Tres cometas celestes en travesía lenta, con su cola viva. */}
      <div
        className="anim-comet absolute"
        style={{ left: '86%', top: '7%', animation: 'comet-fly 26s linear 1s infinite' }}
      >
        <Comet color="#7dd8ff" style={{ width: 300, transform: 'rotate(164deg)' }} />
      </div>
      <div
        className="anim-comet absolute"
        style={{ left: '94%', top: '40%', animation: 'comet-fly 34s linear 12s infinite' }}
      >
        <Comet color="#cfe4ff" style={{ width: 235, transform: 'rotate(172deg)' }} />
      </div>
      <div
        className="anim-comet absolute"
        style={{ left: '60%', top: '20%', animation: 'comet-fly 41s linear 22s infinite' }}
      >
        <Comet color="#9fb8ff" style={{ width: 195, transform: 'rotate(158deg)' }} />
      </div>

      {/* Tres fugaces con ritmos distintos. */}
      <span
        className="anim-shooting absolute h-[2px] w-40 rounded-full"
        style={{
          left: '84%',
          top: '12%',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.95), transparent)',
          boxShadow: '0 0 12px rgba(190,240,255,0.9)',
          animation: 'shooting 9s linear 2s infinite',
        }}
      />
      <span
        className="anim-shooting absolute h-[2px] w-28 rounded-full"
        style={{
          left: '92%',
          top: '34%',
          background: 'linear-gradient(90deg, rgba(255,214,242,0.9), transparent)',
          boxShadow: '0 0 9px rgba(255,190,230,0.75)',
          animation: 'shooting 14s linear 7.5s infinite',
        }}
      />
      <span
        className="anim-shooting absolute h-[2px] w-32 rounded-full"
        style={{
          left: '70%',
          top: '56%',
          background: 'linear-gradient(90deg, rgba(191,251,255,0.9), transparent)',
          boxShadow: '0 0 9px rgba(140,230,255,0.8)',
          animation: 'shooting 19s linear 12s infinite',
        }}
      />

      {/* Viñeta para profundidad cinematográfica. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 42%, transparent 55%, rgba(2,3,12,0.55) 100%)' }}
      />
    </div>
  );
}
