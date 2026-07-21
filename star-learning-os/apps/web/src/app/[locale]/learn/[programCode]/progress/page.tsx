import { redirect } from 'next/navigation';
import type { ProgressResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { rankFor } from '@/lib/ranks';
import { AuroraSurface } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';
import { Chip, Icon, Meter, StarMark, type IconName } from '@/components/ui';

const SKILL_LABELS: Record<string, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  speaking: 'Expresión oral',
  writing: 'Escritura',
  language_use: 'Uso del idioma',
};

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
  surfaceTone,
}: {
  icon: IconName;
  label: string;
  value: number | null;
  detail: string;
  tone: string;
  surfaceTone: 'blue' | 'cyan' | 'gold';
}) {
  return (
    <AuroraSurface tone={surfaceTone} className="h-full p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon name={icon} className="size-4.5" />
        </span>
        <span className="text-[22px] font-extrabold leading-none tabular-nums text-ink">
          {value === null ? '—' : `${Math.round(value * 100)}%`}
        </span>
      </div>
      <p className="mt-4 text-[13px] font-extrabold text-ink">{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-dim">{detail}</p>
    </AuroraSurface>
  );
}

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  const resolution = await resolveEnrollment(programCode);
  if (resolution.kind === 'anonymous') redirect(`/${locale}/login`);
  if (resolution.kind === 'no-enrollment') redirect(`/${locale}/enroll`);
  const enrollment = resolution.enrollment;
  if (enrollment.status === 'pending_diagnostic') {
    redirect(`/${locale}/learn/${programCode}/diagnostic`);
  }

  const progress = await apiFetch<ProgressResponse>(`/enrollments/${enrollment.id}/progress`);
  const rank = rankFor(progress.mastery);
  const currentLevel = progress.placement?.overall ?? '—';
  const masteryPercent = Math.round(progress.mastery * 100);

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <header className="rise">
        <p className="mission-kicker text-[10px] text-teal">Evidencia de dominio</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-[34px] font-extrabold leading-none tracking-[-0.045em] text-ink sm:text-[40px]">
            Progreso
          </h1>
          <span
            className="rounded-full border border-line px-3 py-1 text-[11px] font-extrabold"
            style={{ backgroundColor: `${rank.color}1f`, color: rank.color }}
          >
            {rank.name}
          </span>
        </div>
        <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-dim">
          Recorrer contenido no basta: STAR separa lo visto, lo dominado y lo que todavía recuerdas.
        </p>
      </header>

      <AuroraSurface tone="cyan" className="rise rise-1 overflow-hidden p-5 sm:p-6">
        <span className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-teal/10 blur-3xl" aria-hidden />
        <StarMark className="pointer-events-none absolute right-7 top-7 size-5 text-gold/70" />
        <StarMark className="pointer-events-none absolute bottom-8 left-[46%] size-3 text-primary/40" />

        <div className="relative grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="mission-kicker text-[9px] text-teal">Trayectoria hacia B2</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="rounded-2xl border border-primary/20 bg-primary-soft px-3 py-2 text-[25px] font-extrabold leading-none text-primary-deep">
                {currentLevel}
              </span>
              <span className="relative h-0.5 w-12 overflow-visible bg-gradient-to-r from-primary to-gold sm:w-20" aria-hidden>
                <StarMark className="absolute -right-2 -top-2 size-4 text-gold" />
              </span>
              <span className="rounded-2xl border border-gold/35 bg-gold-soft px-3 py-2 text-[25px] font-extrabold leading-none text-gold-deep">
                B2
              </span>
            </div>
            <p className="mt-4 max-w-md text-[12px] leading-relaxed text-dim">
              {progress.placement
                ? `Tu ubicación tiene ${Math.round(progress.placement.confidence * 100)}% de confianza y cada actividad suma evidencia real.`
                : 'Cada actividad completada ilumina una parte nueva de tu trayectoria.'}
            </p>
          </div>

          <div
            className="relative mx-auto flex size-32 shrink-0 items-center justify-center rounded-full p-[9px] shadow-[0_16px_42px_rgba(26,121,170,0.2)] sm:size-36"
            style={{
              background: `conic-gradient(var(--color-teal) ${masteryPercent}%, var(--color-fill) ${masteryPercent}% 100%)`,
            }}
            role="img"
            aria-label={`${masteryPercent}% de dominio demostrado`}
          >
            <span className="absolute inset-[9px] rounded-full border border-line bg-surface shadow-inner" aria-hidden />
            <span className="relative text-center">
              <strong className="block text-[35px] font-extrabold leading-none tracking-[-0.055em] tabular-nums text-ink">
                {masteryPercent}%
              </strong>
              <span className="mission-kicker mt-1 block text-[8px] text-dim">Dominio</span>
            </span>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-2.5 border-t border-line pt-4 text-[11px]">
          <div className="rounded-2xl bg-primary-soft px-3 py-2.5">
            <span className="font-extrabold tabular-nums text-primary-deep">
              {progress.criticalMastered}/{progress.criticalTotal}
            </span>{' '}
            <span className="text-dim">críticas</span>
          </div>
          <div className="rounded-2xl bg-teal/10 px-3 py-2.5">
            <span className="font-extrabold tabular-nums text-teal">
              {progress.complementaryMastered}/{progress.complementaryTotal}
            </span>{' '}
            <span className="text-dim">complementarias</span>
          </div>
        </div>
      </AuroraSurface>

      <div className="rise rise-2">
        <NovaGuide compact state={progress.mastery >= 0.85 ? 'celebrate' : 'idle'}>
          {rank.next
            ? `Vas como ${rank.name}. Refuerza la habilidad con menos evidencia para acercarte a ${rank.next}.`
            : 'Llegaste al rango más alto. Ahora la misión es mantener fresco lo que ya dominas.'}
        </NovaGuide>
      </div>

      <section className="rise rise-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          icon="route"
          label="Cobertura"
          value={progress.coverage}
          detail="Cuánto del mapa ya recorriste."
          tone="bg-blue/15 text-blue"
          surfaceTone="blue"
        />
        <MetricCard
          icon="review"
          label="Retención"
          value={progress.retention}
          detail="Qué tan fresco sigue en tu memoria."
          tone="bg-teal/15 text-teal"
          surfaceTone="cyan"
        />
        <MetricCard
          icon="check"
          label="Readiness"
          value={progress.readiness}
          detail="Preparación para el siguiente checkpoint."
          tone="bg-ok-soft text-ok-deep"
          surfaceTone="gold"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <section className="rise rise-4">
          <div className="mb-3 px-1">
            <p className="mission-kicker text-[9px] text-dim">Puerta de etapa</p>
            <h2 className="mt-1 text-[19px] font-extrabold text-ink">Requisitos reales</h2>
          </div>
          <AuroraSurface tone="gold" className="overflow-hidden divide-y divide-line">
            <div className="flex items-center gap-3.5 px-4 py-4">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary-deep">
                <Icon name="check" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-ink">Competencias críticas</p>
                <p className="mt-0.5 text-[11px] text-dim">La puerta exige el 100%</p>
              </div>
              <span className="text-[15px] font-extrabold tabular-nums text-ink">
                {progress.criticalMastered}/{progress.criticalTotal}
              </span>
            </div>
            <div className="flex items-center gap-3.5 px-4 py-4">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-teal/15 text-teal">
                <Icon name="check" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-ink">Complementarias</p>
                <p className="mt-0.5 text-[11px] text-dim">La puerta exige el 85%</p>
              </div>
              <span className="text-[15px] font-extrabold tabular-nums text-ink">
                {progress.complementaryMastered}/{progress.complementaryTotal}
              </span>
            </div>
          </AuroraSurface>
          {progress.placement && (
            <AuroraSurface tone="neutral" className="mt-3 flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-[12px] font-semibold text-dim">StarMap</span>
              <Chip tone={progress.placement.provisional ? 'warn' : 'ok'}>
                {progress.placement.provisional ? 'En revisión humana' : 'Nivel confirmado'}
              </Chip>
            </AuroraSurface>
          )}
        </section>

        <section className="rise rise-4">
          <div className="mb-3 px-1">
            <p className="mission-kicker text-[9px] text-dim">Radar de habilidades</p>
            <h2 className="mt-1 text-[19px] font-extrabold text-ink">Por habilidad</h2>
          </div>
          <AuroraSurface tone="cyan" className="grid gap-5 px-5 py-5 sm:grid-cols-2">
            {progress.perSkill.map((entry) => (
              <Meter
                key={entry.skill}
                label={SKILL_LABELS[entry.skill] ?? entry.skill}
                value={entry.total === 0 ? 0 : entry.mastered / entry.total}
                tone="blue"
                hint={`${entry.mastered} de ${entry.total} dominadas`}
              />
            ))}
          </AuroraSurface>
        </section>
      </div>
    </div>
  );
}
