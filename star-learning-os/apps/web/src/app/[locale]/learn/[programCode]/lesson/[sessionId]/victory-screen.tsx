'use client';

import { Confetti } from '@/components/confetti';
import { Icon, StarMark } from '@/components/ui';

export interface SessionStats {
  answered: number;
  correct: number;
  bestCombo: number;
  xp: number;
}

/** Pantalla de victoria al cerrar la sesión: confetti y stats de la práctica. */
export function VictoryScreen({
  stats,
  onContinue,
}: {
  stats: SessionStats;
  onContinue: () => void;
}) {
  const accuracy = stats.answered === 0 ? 0 : Math.round((stats.correct / stats.answered) * 100);
  return (
    <div className="rise relative flex flex-col items-center pt-6 text-center">
      <Confetti />
      <span className="relative inline-flex items-center justify-center">
        <span className="halo-ring absolute -inset-4 rounded-full" aria-hidden />
        <span className="grad-brand icon-glow flex size-20 items-center justify-center rounded-full">
          <StarMark className="size-9 text-white" />
        </span>
      </span>
      <h1 className="mt-6 text-[30px] font-extrabold tracking-tight text-ink">
        ¡Sesión completada!
      </h1>
      <p className="mt-1.5 max-w-[34ch] text-[15px] leading-relaxed text-dim">
        Cada respuesta cuenta para tu dominio. Así te fue:
      </p>

      <div className="mt-7 grid w-full max-w-sm grid-cols-3 gap-3">
        <div className="card-shadow rounded-2xl bg-surface px-3 py-4">
          <p className="text-[24px] font-extrabold tabular-nums text-ink">
            {stats.correct}
            <span className="text-[15px] font-semibold text-dim">/{stats.answered}</span>
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-dim">Aciertos</p>
        </div>
        <div className="card-shadow rounded-2xl bg-surface px-3 py-4">
          <p className="flex items-center justify-center gap-1 text-[24px] font-extrabold tabular-nums text-ink">
            <Icon name="flame" className="size-5 text-gold" />
            {stats.bestCombo}
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-dim">Mejor racha</p>
        </div>
        <div className="card-shadow rounded-2xl bg-surface px-3 py-4">
          <p className="text-gradient text-[24px] font-extrabold tabular-nums">+{stats.xp}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-dim">XP</p>
        </div>
      </div>

      <p className="mt-4 text-[13px] font-medium text-dim">Precisión: {accuracy}%</p>

      <button
        type="button"
        onClick={onContinue}
        className="btn-gradient mt-7 w-full max-w-sm rounded-2xl py-3.5 text-[17px] font-semibold text-white"
      >
        Continuar
      </button>
    </div>
  );
}
