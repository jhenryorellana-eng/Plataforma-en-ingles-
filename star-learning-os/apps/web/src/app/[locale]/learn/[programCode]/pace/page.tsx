'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollmentResponse, PaceOptionsResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Chip, Group, Icon, LoadingStack } from '@/components/ui';

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
          (e) => e.program.code === programCode && ['active', 'paused'].includes(e.status),
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
      return <p className="mt-16 text-center text-[15px] text-risk">{error}</p>;
    }
    return <LoadingStack label="Preparando tus alternativas de ritmo" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rise">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
          Tu diagnóstico está listo
        </p>
        <h1 className="mt-0.5 text-[34px] font-extrabold leading-tight tracking-tight text-ink">
          Elige tu ritmo
        </h1>
        <p className="mt-1 text-[15px] leading-relaxed text-dim">
          Nivel de entrada <strong className="font-semibold text-ink">{options.entryLevel}</strong>
          {enrollment.placement?.provisional ? ' (provisional, en revisión humana)' : ''} · te
          separan {options.remainingHoursMin}–{options.remainingHoursMax} horas efectivas de la meta
          B2. El estándar de salida no cambia: solo cambia el calendario.
        </p>
      </header>

      <Group className="rise rise-1">
        {options.options.map((option) => {
          const isSelected = selected === option.code;
          return (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!option.allowed}
              onClick={() => option.allowed && setSelected(option.code)}
              className={`flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors ${
                option.allowed ? 'hover:bg-mist/60' : 'opacity-45'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-bold text-ink">{option.name}</span>
                  {option.recommended && <Chip tone="primary">Recomendado</Chip>}
                </div>
                <p className="mt-1 text-[15px] font-semibold text-primary">
                  Llegada estimada a B2: {option.monthsMin}–{option.monthsMax} meses
                </p>
                <p className="mt-0.5 text-[13px] leading-snug text-dim">
                  {option.weeklyStudyHours} h de práctica por semana · {option.weeklyVoiceMinutes} min
                  de voz con tu Mentor incluidos
                </p>
                {option.note && (
                  <p className="mt-1 text-[12px] leading-snug text-dim">{option.note}</p>
                )}
              </div>
              {isSelected && option.allowed && (
                <Icon name="check" className="mt-1 size-5 shrink-0 text-primary" />
              )}
            </button>
          );
        })}
      </Group>

      <button
        type="button"
        disabled={busy}
        onClick={confirm}
        className="rise rise-2 w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? 'Confirmando…' : 'Confirmar mi ritmo'}
      </button>

      <p className="rise rise-3 px-5 text-center text-[12px] leading-relaxed text-dim">
        Podrás cambiar de ritmo al cierre de cada ciclo sin perder progreso. Las fechas son
        estimaciones de planificación, no garantías; el precio se define con la pasarela de pagos
        (decisión D25). Elegir un ritmo rápido nunca omite competencias ni repasos.
      </p>

      {error && (
        <div className="rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
    </div>
  );
}
