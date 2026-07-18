/**
 * Accesorios de la tienda, un renderer por id de catálogo. Se reparten en
 * tres capas: atrás del cuerpo (back), delante del rostro (front) y aura.
 */
const BACK_ITEMS = ['wings_cosmic'] as const;
const FRONT_ITEMS = ['glasses_round', 'glasses_star', 'cap_starbiz', 'antenna_glow', 'headphones', 'helmet_space'] as const;
const AURA_ITEMS = ['halo_gold'] as const;

const STAR_LENS = 'M 0 -9 C 1 -3.4 3.4 -1 9 0 C 3.4 1 1 3.4 0 9 C -1 3.4 -3.4 1 -9 0 C -3.4 -1 -1 -3.4 0 -9 Z';

function WingsCosmic() {
  const wing = (
    <>
      <path d="M 45 95 C 28 90 14 76 12 55 C 18 62 24 62 24 54 C 29 60 34 59 33 50 C 42 58 46 74 46 95 Z" fill="#8a88ff" />
      <path d="M 43 91 C 31 85 22 74 20 61 C 24 66 29 65 28 58 C 33 63 37 61 36 55 C 42 62 44 76 43 91 Z" fill="#17b8cd" opacity={0.5} />
      <path d="M 40 87 C 31 81 24 73 21.5 63" fill="none" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" opacity={0.45} />
    </>
  );
  return (
    <g>
      {wing}
      <g transform="matrix(-1 0 0 1 120 0)">{wing}</g>
    </g>
  );
}

function GlassesRound() {
  return (
    <g fill="none" stroke="#3a3852" strokeWidth={2.3} strokeLinecap="round">
      <circle cx={49} cy={55} r={7.2} fill="#ffffff" fillOpacity={0.14} />
      <circle cx={71} cy={55} r={7.2} fill="#ffffff" fillOpacity={0.14} />
      <path d="M 56.2 54 Q 60 51.8 63.8 54" />
      <path d="M 41.8 54 L 35 52.5" />
      <path d="M 78.2 54 L 85 52.5" />
      <path d="M 45.5 50.5 L 49 56.5" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.5} />
    </g>
  );
}

function GlassesStar() {
  return (
    <g>
      <g fill="#ffb340" stroke="#e08a00" strokeWidth={1.6} strokeLinejoin="round">
        <path d={STAR_LENS} transform="translate(49 55)" />
        <path d={STAR_LENS} transform="translate(71 55)" />
      </g>
      <g fill="none" stroke="#e08a00" strokeWidth={2.1} strokeLinecap="round">
        <path d="M 57.4 54 Q 60 52.2 62.6 54" />
        <path d="M 40.6 53.5 L 35 52" />
        <path d="M 79.4 53.5 L 85 52" />
      </g>
      <circle cx={46.5} cy={51.5} r={1.1} fill="#ffffff" opacity={0.8} />
      <circle cx={68.5} cy={51.5} r={1.1} fill="#ffffff" opacity={0.8} />
    </g>
  );
}

function CapStarbiz() {
  return (
    <g>
      <path d="M 35 45 C 35 28 46 21 60 21 C 74 21 85 28 85 45 C 73 39 47 39 35 45 Z" fill="#4b49d6" />
      <path d="M 44 41 C 33 43 25 48 24 54 C 33 56 44 52 48 46 Z" fill="#3a38ad" />
      <circle cx={60} cy={20.5} r={2.2} fill="#3a38ad" />
      <path d="M 60 27 C 60.6 30.2 62.4 32 65.6 32.6 C 62.4 33.2 60.6 35 60 38.2 C 59.4 35 57.6 33.2 54.4 32.6 C 57.6 32 59.4 30.2 60 27 Z" fill="#ffffff" />
    </g>
  );
}

function AntennaGlow() {
  return (
    <g>
      <path d="M 60 24 C 59 16 62 11 66 8" fill="none" stroke="#7c7aff" strokeWidth={3} strokeLinecap="round" />
      <circle cx={66.5} cy={7.5} r={7.5} fill="#2fe6ff" opacity={0.22} />
      <circle cx={66.5} cy={7.5} r={4} fill="#2fe6ff" />
      <circle cx={65} cy={6} r={1.3} fill="#ffffff" opacity={0.85} />
    </g>
  );
}

function Headphones() {
  return (
    <g>
      <path d="M 35 54 C 35 31 45 23 60 23 C 75 23 85 31 85 54" fill="none" stroke="#34324e" strokeWidth={5.5} strokeLinecap="round" />
      <rect x={29.5} y={48} width={11} height={19} rx={5.5} fill="#4b49d6" />
      <rect x={79.5} y={48} width={11} height={19} rx={5.5} fill="#4b49d6" />
      <ellipse cx={35} cy={57.5} rx={2.6} ry={5} fill="#7c7aff" />
      <ellipse cx={85} cy={57.5} rx={2.6} ry={5} fill="#7c7aff" />
    </g>
  );
}

function HelmetSpace() {
  return (
    <g>
      <circle cx={60} cy={54} r={35} fill="#bfe3ff" fillOpacity={0.13} stroke="#d7e6f7" strokeWidth={3} />
      <path d="M 39 38 A 25 25 0 0 1 57 29" fill="none" stroke="#ffffff" strokeWidth={4.5} strokeLinecap="round" opacity={0.55} />
      <circle cx={36.5} cy={44.5} r={2} fill="#ffffff" opacity={0.45} />
      <ellipse cx={60} cy={92.5} rx={17} ry={5.5} fill="#c6d2e4" stroke="#9fb0c8" strokeWidth={2} />
    </g>
  );
}

function HaloGold() {
  return (
    <g fill="none" strokeLinecap="round">
      <ellipse cx={60} cy={13} rx={17} ry={5} stroke="#ffd873" strokeWidth={7} opacity={0.28} />
      <ellipse cx={60} cy={13} rx={17} ry={5} stroke="#ffc94d" strokeWidth={3} />
    </g>
  );
}

/** Renderer por id; ids desconocidos se omiten (catálogo puede crecer). */
export function Accessory({ id }: { id: string }) {
  switch (id) {
    case 'wings_cosmic':
      return <WingsCosmic />;
    case 'glasses_round':
      return <GlassesRound />;
    case 'glasses_star':
      return <GlassesStar />;
    case 'cap_starbiz':
      return <CapStarbiz />;
    case 'antenna_glow':
      return <AntennaGlow />;
    case 'headphones':
      return <Headphones />;
    case 'helmet_space':
      return <HelmetSpace />;
    case 'halo_gold':
      return <HaloGold />;
    default:
      return null;
  }
}

/** Reparte ids equipados en capas de pintado, en orden estable. */
export function partitionAccessories(ids: string[]): { back: string[]; front: string[]; aura: string[] } {
  return {
    back: BACK_ITEMS.filter((item) => ids.includes(item)),
    front: FRONT_ITEMS.filter((item) => ids.includes(item)),
    aura: AURA_ITEMS.filter((item) => ids.includes(item)),
  };
}
