'use client';

import { useRef, useState } from 'react';
import { Card, Icon } from './ui';

type MicState = 'idle' | 'testing' | 'ok' | 'fail';

/**
 * Prueba técnica antes de hablar (TEC-01): micrófono con medidor de nivel y
 * prueba de altavoz. Un fallo no bloquea: la misión ofrece modo texto (TLK-04).
 */
export function MicTest({ onDone }: { onDone: (micOk: boolean) => void }) {
  const [micState, setMicState] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  const [speakerPlayed, setSpeakerPlayed] = useState(false);
  const [speakerConfirmed, setSpeakerConfirmed] = useState(false);
  const doneRef = useRef(false);

  async function testMic() {
    setMicState('testing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      let peak = 0;
      const startedAt = Date.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const value of data) {
            const centered = (value - 128) / 128;
            sum += centered * centered;
          }
          const rms = Math.sqrt(sum / data.length);
          peak = Math.max(peak, rms);
          setLevel(Math.min(1, rms * 6));
          if (Date.now() - startedAt < 3500) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        };
        tick();
      });

      stream.getTracks().forEach((track) => track.stop());
      await context.close();
      setMicState(peak > 0.02 ? 'ok' : 'fail');
    } catch {
      setMicState('fail');
    }
  }

  function playTone() {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 523.25;
    gain.gain.value = 0.15;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      void context.close();
      setSpeakerPlayed(true);
    }, 600);
  }

  const finished = (micState === 'ok' || micState === 'fail') && speakerConfirmed;
  if (finished && !doneRef.current) {
    doneRef.current = true;
    onDone(micState === 'ok');
  }

  return (
    <Card className="px-4 py-4">
      <p className="text-[15px] font-semibold text-ink">Prueba técnica</p>
      <p className="mt-0.5 text-[13px] leading-snug text-dim">
        Comprobamos tu micrófono y audio para que la sesión sea válida.
      </p>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={micState === 'testing'}
          onClick={testMic}
          className="flex items-center gap-2 rounded-xl bg-primary-soft px-3.5 py-2 text-[14px] font-semibold text-primary transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          <Icon name="mic" className="size-4" />
          {micState === 'testing' ? 'Habla ahora…' : 'Probar micrófono'}
        </button>
        {micState === 'ok' && <span className="text-[13px] font-semibold text-ok-deep">Se te escucha bien</span>}
        {micState === 'fail' && (
          <span className="text-[13px] font-semibold text-gold-deep">
            No detectamos audio — tendrás modo texto
          </span>
        )}
      </div>
      {micState === 'testing' && (
        <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-fill">
          <div
            className="h-full rounded-full bg-ok transition-[width] duration-100"
            style={{ width: `${Math.round(level * 100)}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
        <button
          type="button"
          onClick={playTone}
          className="rounded-xl bg-primary-soft px-3.5 py-2 text-[14px] font-semibold text-primary transition-opacity hover:opacity-80"
        >
          Probar sonido
        </button>
        {speakerPlayed && !speakerConfirmed && (
          <button
            type="button"
            onClick={() => setSpeakerConfirmed(true)}
            className="text-[14px] font-semibold text-ok-deep underline underline-offset-2"
          >
            Sí, lo escuché
          </button>
        )}
        {speakerConfirmed && <span className="text-[13px] font-semibold text-ok-deep">Audio confirmado</span>}
      </div>
    </Card>
  );
}
