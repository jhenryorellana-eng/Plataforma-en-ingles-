'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollmentResponse, PaceOptionsResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Chip, Icon, LoadingStack, type IconName } from '@/components/ui';
import { AuroraHero } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';

type PaceVisual = { icon: IconName; label: string; tone: string; track: string };

const DEFAULT_PACE_VISUAL: PaceVisual = {
  icon: 'flame',
  label: 'Propulsión equilibrada',
  tone: 'bg-primary-soft text-primary-deep',
  track: 'from-primary to-teal',
};

const PACE_VISUALS: Record<string, PaceVisual> = {
  flex: {
    icon: 'route',
    label: 'Órbita estable',
    tone: 'bg-teal/15 text-teal',
    track: 'from-teal to-blue',
  },
  accelerated: DEFAULT_PACE_VISUAL,
  sprint: {
    icon: 'flag',
    label: 'Impulso intensivo',
    tone: 'bg-gold-soft text-gold-deep',
    track: 'from-gold to-risk',
  },
};

export default function PacePage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = use(params);
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [options, setOptions] = useState<PaceOptionsResponse | null>(null);
  const [selected, setSelected] = useState<string>('accelerated');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        const enrollments = await clientApi<EnrollmentResponse[]>('/enrollments');
        const found = enrollments.find(
          (candidate) =>
            candidate.program.code === programCode && ['active', 'paused'].includes(candidate.status),
        );
        if (!found) {
          router.push(`/${locale}/learn`);
          return;
        }
        setEnrollment(found);
        setSelected(found.paceCode);
        setOptions(await clientApi<PaceOptionsResponse>(`/enrollments/${found.id}/pace-options`));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los ritmos');
      }
    }
    void boot();
  }, [locale, programCode, router]);

  async function confirm() {
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/enrollments/${enrollment.id}/pace`, {
        method: 'PATCH',
        body: JSON.stringify({ paceCode: selected }),
      });
      router.push(`/${locale}/learn/${programCode}/today`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar tu ritmo');
      setBusy(false);
    }
  }

  if (!options || !enrollment) {
    if (error) {
      return (
        <div className="mx-auto mt-10 max-w-xl">
          <NovaGuide state="paused" eyebrow="Nova · ruta no disponible">
            {error}. Revisa tu conexión e inténtalo nuevamente.
          </NovaGuide>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-5">
        <AuroraHero
          asset="starmap"
          eyebrow="Tu diagnóstico está listo"
          title="Calculando tus rutas a B2"
          body="Comparamos tu nivel real con tres calendarios que mantienen exactamente el mismo estándar de salida."
          tone="gold"
          compact
          priority
        />
        <LoadingStack label="Preparando tus alternativas de ritmo" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <AuroraHero
        asset="starmap"
        eyebrow="Tu diagnóstico está listo"
        title="Elige el impulso de tu ruta"
        body={
          <>
            Partes desde <strong className="text-white">{options.entryLevel}</strong>
            {enrollment.placement?.provisional ? ' · resultado provisional en revisión humana' : ''}.
            Te separan {options.remainingHoursMin}–{options.remainingHoursMax} horas efectivas de B2;
            cambia el calendario, nunca el estándar.
          </>
        }
        badge={
          <span className="rounded-full border border-white/20 bg-[#071525]/70 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#ffd35a] backdrop-blur">
            Nivel {options.entryLevel}
          </span>
        }
        tone="gold"
        compact
        priority
      />

      <NovaGuide compact state="thinking">
        Elige una ruta que puedas sostener. Podrás reajustarla al final de cada ciclo sin perder progreso.
      </NovaGuide>

      <div
        role="radiogroup"
        aria-label="Ritmos disponibles"
        className="rise rise-1 grid gap-4 lg:grid-cols-3"
      >
        {options.options.map((option) => {
          const isSelected = selected === option.code;
          const visual = PACE_VISUALS[option.code] ?? DEFAULT_PACE_VISUAL;
          return (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!option.allowed}
              onClick={() => option.allowed && setSelected(option.code)}
              className={`mission-choice group flex min-h-[238px] w-full flex-col rounded-[24px] p-5 text-left ${
                isSelected ? 'border-primary bg-primary-soft ring-2 ring-primary/25' : ''
              } ${option.allowed ? '' : 'cursor-not-allowed opacity-45'}`}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <span
                  className={`flex size-12 items-center justify-center rounded-[17px] shadow-[0_4px_0_color-mix(in_srgb,var(--color-fill)_70%,#06111f)] ${visual.tone}`}
                >
                  <Icon name={visual.icon} className="size-5" />
                </span>
                <span
                  className={`flex size-7 items-center justify-center rounded-full border ${
                    isSelected
                      ? 'border-primary bg-primary text-white'
                      : 'border-line bg-surface text-transparent'
                  }`}
                >
                  <Icon name="check" className="size-3.5" />
                </span>
              </div>
              <p className="mission-kicker mt-4 text-[9px] text-dim">{visual.label}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[19px] font-extrabold leading-none text-ink">{option.name}</span>
                {option.recommended && <Chip tone="primary">Recomendado</Chip>}
              </div>
              <p className="mt-3 text-[14px] font-extrabold text-primary-deep">
                B2 en {option.monthsMin}–{option.monthsMax} meses
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-fill">
                <span
                  className={`block h-full w-2/3 rounded-full bg-gradient-to-r ${visual.track}`}
                />
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-dim">
                {option.weeklyStudyHours} h de práctica semanal · {option.weeklyVoiceMinutes} min de
                voz con Nova
              </p>
              {option.note && (
                <p className="mt-auto pt-3 text-[11px] leading-snug text-dim">{option.note}</p>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={confirm}
        className="tactile-button rise rise-2 min-h-14 w-full rounded-2xl text-[16px] font-extrabold text-white disabled:opacity-50"
      >
        {busy ? 'Activando tu ruta…' : 'Confirmar este impulso →'}
      </button>

      <p className="rise rise-3 px-5 text-center text-[12px] leading-relaxed text-dim">
        Podrás cambiar de ritmo al cierre de cada ciclo sin perder progreso. Las fechas son
        estimaciones de planificación, no garantías; elegir una ruta rápida nunca omite competencias
        ni repasos.
      </p>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk"
        >
          {error}
        </div>
      )}
    </div>
  );
}
