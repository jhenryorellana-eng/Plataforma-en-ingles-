'use client';

import { useEffect, useId, useRef, type RefObject } from 'react';

/**
 * Nova: el Mentor de voz de StarbizAcademy. Un espíritu de aurora (gota de luz
 * lavanda/rosa/cian con núcleo dorado) pensado para adolescentes: cálido y
 * calmado, nunca estridente. Los estados son clases CSS y la voz reacciona a
 * la amplitud real del audio vía la variable `--nova-amp` (sin re-renders).
 */
export type NovaState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'paused' | 'celebrate';

const BODY_PATH =
  'M100 26 C128 50 148 82 148 112 A48 48 0 1 1 52 112 C52 82 72 50 100 26 Z';

/** Destellos que convergen al nacer (deterministas para SSR). */
const BIRTH_SPARKS = [
  { sx: -64, sy: -52, r: 3.2, fill: '#7df9ff', delay: 0 },
  { sx: 58, sy: -66, r: 2.6, fill: '#ff9ecf', delay: 0.08 },
  { sx: -78, sy: 8, r: 2.8, fill: '#c4b5fd', delay: 0.16 },
  { sx: 74, sy: 16, r: 3.0, fill: '#ffe08a', delay: 0.05 },
  { sx: -40, sy: 62, r: 2.4, fill: '#ff9ecf', delay: 0.22 },
  { sx: 44, sy: 66, r: 2.8, fill: '#7df9ff', delay: 0.14 },
  { sx: 0, sy: -84, r: 2.6, fill: '#c4b5fd', delay: 0.1 },
  { sx: -8, sy: 84, r: 2.5, fill: '#ffe08a', delay: 0.26 },
];

export function NovaFace({
  state = 'idle',
  stream = null,
  reactive = false,
  born = false,
  className = 'size-32',
  decorative = false,
  label = 'Nova, tu mentora de voz',
}: {
  state?: NovaState;
  /** Stream remoto del Mentor: alimenta la reacción de voz cuando `reactive`. */
  stream?: MediaStream | null;
  reactive?: boolean;
  /** Animación de nacimiento (una sola vez, al entrar a la misión). */
  born?: boolean;
  className?: string;
  /** Evita anuncios repetidos cuando Nova solo acompaña una escena ya descrita. */
  decorative?: boolean;
  label?: string;
}) {
  const uid = `nova-${useId().replace(/:/g, '')}`;
  const rootRef = useRef<HTMLSpanElement>(null);
  useAudioLevel(stream, reactive && state === 'speaking', rootRef);

  const happy = state === 'listening' || state === 'celebrate';

  return (
    <span
      ref={rootRef}
      className={`nova is-${state} ${born ? 'nova-born' : ''} relative inline-flex items-center justify-center ${className}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      {/* Aura que respira con la voz real del Mentor. */}
      <span className="nova-aura absolute -inset-[18%] rounded-full" aria-hidden />
      <svg viewBox="0 0 200 200" className="relative size-full overflow-visible">
        <defs>
          <radialGradient id={`${uid}-lav`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-pink`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ff9ecf" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ff9ecf" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-cyan`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#7df9ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7df9ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-core`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#fff3c9" />
            <stop offset="55%" stopColor="#ffe08a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffe08a" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-body`}>
            <path d={BODY_PATH} />
          </clipPath>
        </defs>

        {/* Anillo de Saturno suave: solo cuando Nova piensa. */}
        <g className="nova-ring" aria-hidden>
          <ellipse
            cx="100"
            cy="118"
            rx="74"
            ry="20"
            fill="none"
            stroke="#c4b5fd"
            strokeWidth="2.5"
            strokeDasharray="3 7"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>

        {born && (
          <g className="nova-sparks" aria-hidden>
            {BIRTH_SPARKS.map((spark) => (
              <circle
                key={`${spark.sx}-${spark.sy}`}
                cx="100"
                cy="104"
                r={spark.r}
                fill={spark.fill}
                style={
                  {
                    '--sx': `${spark.sx}px`,
                    '--sy': `${spark.sy}px`,
                    animationDelay: `${spark.delay}s`,
                    filter: `drop-shadow(0 0 5px ${spark.fill})`,
                  } as React.CSSProperties
                }
              />
            ))}
          </g>
        )}

        {/* Cuerpo: malla de aurora recortada a la gota. */}
        <g className="nova-body">
          <path
            d={BODY_PATH}
            fill="#1d1d33"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="2"
          />
          <g clipPath={`url(#${uid}-body)`}>
            <circle className="nova-blob-a" cx="72" cy="70" r="58" fill={`url(#${uid}-lav)`} />
            <circle className="nova-blob-b" cx="132" cy="92" r="52" fill={`url(#${uid}-pink)`} />
            <circle className="nova-blob-c" cx="78" cy="138" r="54" fill={`url(#${uid}-cyan)`} />
            <circle cx="100" cy="126" r="44" fill={`url(#${uid}-core)`} opacity="0.9" />
          </g>
          <path d={BODY_PATH} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.6" opacity="0.8" />
        </g>

        {/* Cara: ojos suaves, sonrisa serena y rubor. */}
        <g className="nova-face">
          <circle cx="73" cy="116" r="7" fill="#ff9ecf" opacity="0.45" />
          <circle cx="127" cy="116" r="7" fill="#ff9ecf" opacity="0.45" />
          {happy ? (
            <g stroke="#241f45" strokeWidth="4.5" strokeLinecap="round" fill="none">
              <path d="M74 104 Q82 95 90 104" />
              <path d="M110 104 Q118 95 126 104" />
            </g>
          ) : (
            <g className="nova-eyes" fill="#241f45">
              <ellipse cx="82" cy="102" rx="6.5" ry="8" />
              <ellipse cx="118" cy="102" rx="6.5" ry="8" />
              <circle cx="84.5" cy="98.5" r="2" fill="#ffffff" opacity="0.9" />
              <circle cx="120.5" cy="98.5" r="2" fill="#ffffff" opacity="0.9" />
            </g>
          )}
          <path
            d="M93 122 Q100 127 107 122"
            stroke="#241f45"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          />
        </g>
      </svg>
    </span>
  );
}

/**
 * Amplitud real del stream → variable CSS `--nova-amp` en la raíz del
 * componente (rAF + suavizado, cero re-renders de React).
 */
function useAudioLevel(
  stream: MediaStream | null,
  active: boolean,
  target: RefObject<HTMLSpanElement | null>,
) {
  useEffect(() => {
    const element = target.current;
    if (!stream || !active || !element) return;
    const context = new AudioContext();
    void context.resume();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let index = 0; index < data.length; index += 1) {
        const value = ((data[index] ?? 128) - 128) / 128;
        sum += value * value;
      }
      const rms = Math.min(1, Math.sqrt(sum / data.length) * 3.2);
      smooth += (rms - smooth) * 0.18;
      element.style.setProperty('--nova-amp', smooth.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      element.style.setProperty('--nova-amp', '0');
      source.disconnect();
      void context.close();
    };
  }, [stream, active, target]);
}
