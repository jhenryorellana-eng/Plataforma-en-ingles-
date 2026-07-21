'use client';

import { Confetti } from '@/components/confetti';
import { Icon, StarMark } from '@/components/ui';
import { NovaFace } from '@/components/nova';
import { AuroraSurface } from '@/components/aurora/aurora-hero';

export interface SessionStats {
  answered: number;
  correct: number;
  bestCombo: number;
  xp: number;
}

/** Cierre inmersivo: Nova, constelación desbloqueada y evidencia real de la práctica. */
export function VictoryScreen({
  stats,
  onContinue,
}: {
  stats: SessionStats;
  onContinue: () => void;
}) {
  const accuracy = stats.answered === 0 ? 0 : Math.round((stats.correct / stats.answered) * 100);

  return (
    <AuroraSurface
      tone="gold"
      className="rise relative isolate overflow-hidden px-5 py-7 text-center sm:px-8 sm:py-9"
    >
      <Confetti />
      <span
        className="pointer-events-none absolute -right-24 -top-24 -z-10 size-72 rounded-full border border-gold/20 shadow-[inset_0_0_80px_rgba(255,211,90,.08),0_0_60px_rgba(89,108,255,.12)]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-80 rounded-full border border-teal/15"
        aria-hidden
      />

      <span className="relative inline-flex items-center justify-center">
        <span className="absolute -inset-7 rounded-full bg-[radial-gradient(circle,rgba(255,211,90,.22),rgba(89,108,255,.12)_48%,transparent_70%)] blur-xl" aria-hidden />
        <span className="absolute -left-9 top-2 text-gold" aria-hidden>
          <StarMark className="size-5" />
        </span>
        <span className="absolute -right-7 bottom-5 text-teal" aria-hidden>
          <StarMark className="size-3.5" />
        </span>
        <NovaFace state="celebrate" className="relative size-32 sm:size-36" />
      </span>

      <p className="mission-kicker mt-4 text-[10px] text-gold-deep">Constelación activada</p>
      <h1 className="mt-1 text-[31px] font-extrabold tracking-[-0.045em] text-ink sm:text-[38px]">
        ¡Misión completada!
      </h1>
      <p className="mx-auto mt-2 max-w-[38ch] text-[14px] leading-relaxed text-dim">
        Cada respuesta deja evidencia en tu ruta. Esta es la señal que acabas de construir.
      </p>

      <div className="mx-auto mt-7 grid w-full max-w-md grid-cols-3 gap-2.5 sm:gap-3">
        <div className="rounded-[20px] border border-line bg-surface/70 px-2 py-4 shadow-[0_4px_0_color-mix(in_srgb,var(--color-fill)_70%,#06111f)]">
          <p className="text-[23px] font-extrabold tabular-nums text-ink sm:text-[26px]">
            {stats.correct}
            <span className="text-[13px] font-semibold text-dim">/{stats.answered}</span>
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-dim">Aciertos</p>
        </div>
        <div className="rounded-[20px] border border-gold/20 bg-gold-soft/60 px-2 py-4 shadow-[0_4px_0_color-mix(in_srgb,var(--color-fill)_70%,#06111f)]">
          <p className="flex items-center justify-center gap-1 text-[23px] font-extrabold tabular-nums text-ink sm:text-[26px]">
            <Icon name="flame" className="size-5 text-gold" />
            {stats.bestCombo}
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-dim">Racha</p>
        </div>
        <div className="rounded-[20px] border border-primary/20 bg-primary-soft/60 px-2 py-4 shadow-[0_4px_0_color-mix(in_srgb,var(--color-fill)_70%,#06111f)]">
          <p className="text-gradient text-[23px] font-extrabold tabular-nums sm:text-[26px]">+{stats.xp}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-dim">XP</p>
        </div>
      </div>

      <div className="mx-auto mt-5 flex max-w-md items-center gap-3 rounded-2xl border border-ok/20 bg-ok-soft/60 px-4 py-3 text-left">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ok text-white">
          <Icon name="progress" className="size-4.5" />
        </span>
        <span>
          <span className="block text-[10px] font-extrabold uppercase tracking-wide text-ok-deep">
            Precisión de la misión
          </span>
          <span className="block text-[17px] font-extrabold tabular-nums text-ink">{accuracy}%</span>
        </span>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="tactile-button mt-7 min-h-14 w-full max-w-md rounded-2xl text-[16px] font-extrabold text-white"
      >
        Volver a mi ruta →
      </button>
    </AuroraSurface>
  );
}
