import { redirect } from 'next/navigation';
import type { ProgressResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { rankFor } from '@/lib/ranks';
import { Card, Chip, Group, Meter, RingCluster, Row, SectionHeader } from '@/components/ui';

const SKILL_LABELS: Record<string, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  speaking: 'Expresión oral',
  writing: 'Escritura',
  language_use: 'Uso del idioma',
};

const RING_COLORS = {
  coverage: { from: '#57a8ff', to: '#0a6fe0' },
  mastery: { from: '#8f8dff', to: '#4b49d6' },
  retention: { from: '#3fd2e6', to: '#0f96ad' },
  readiness: { from: '#55d97e', to: '#1d9c4b' },
} as const;

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  const enrollment = await resolveEnrollment(programCode);
  if (!enrollment) redirect(`/${locale}/login`);
  if (enrollment.status === 'pending_diagnostic') redirect(`/${locale}/learn/${programCode}/diagnostic`);

  const progress = await apiFetch<ProgressResponse>(`/enrollments/${enrollment.id}/progress`);

  const legend = [
    { key: 'Cobertura', value: progress.coverage, ...RING_COLORS.coverage, hint: 'del mapa recorrido' },
    { key: 'Dominio', value: progress.mastery, ...RING_COLORS.mastery, hint: 'demostrado con evidencia' },
    { key: 'Retención', value: progress.retention, ...RING_COLORS.retention, hint: 'sigue fresco en memoria' },
    { key: 'Readiness', value: progress.readiness, ...RING_COLORS.readiness, hint: 'simulacros S4 · aún no aplica' },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header className="rise">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink">
            Progreso
          </h1>
          <span
            className="rounded-full px-3 py-1 text-[13px] font-bold"
            style={{
              backgroundColor: `${rankFor(progress.mastery).color}22`,
              color: rankFor(progress.mastery).color,
            }}
          >
            {rankFor(progress.mastery).name}
          </span>
        </div>
        <p className="mt-1 text-[15px] leading-relaxed text-dim">
          Cuatro medidas, una verdad: dominar no es solo recorrer.
        </p>
      </header>

      <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-8">
        <Card className="rise rise-1 px-5 py-6">
          <div className="flex items-center gap-6">
            <RingCluster
              size={172}
              rings={legend.map((entry) => ({ value: entry.value, color: entry.from, colorTo: entry.to }))}
            >
              <span className="text-gradient text-[26px] font-extrabold leading-none tabular-nums">
                {Math.round(progress.mastery * 100)}%
              </span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-dim">
                dominio
              </span>
            </RingCluster>
            <ul className="flex min-w-0 flex-1 flex-col gap-3">
              {legend.map((entry) => (
                <li key={entry.key} className="flex items-baseline gap-2.5">
                  <span
                    className="size-2.5 shrink-0 translate-y-[-1px] rounded-full"
                    style={{ backgroundImage: `linear-gradient(135deg, ${entry.from}, ${entry.to})` }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[15px] font-semibold text-ink">{entry.key}</span>
                      <span className="text-[15px] font-bold tabular-nums" style={{ color: entry.to }}>
                        {entry.value === null ? '—' : `${Math.round(entry.value * 100)}%`}
                      </span>
                    </div>
                    <p className="text-[12px] leading-snug text-dim">{entry.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="flex flex-col gap-7">
          {progress.placement && (
            <section className="rise rise-2">
              <SectionHeader>Nivel</SectionHeader>
              <Group>
                <Row
                  icon="progress"
                  iconColor="bg-primary"
                  title="Nivel estimado"
                  subtitle={`Confianza ${Math.round(progress.placement.confidence * 100)}%`}
                  trailing={
                    <span className="flex items-center gap-2">
                      <span className="text-[22px] font-extrabold text-primary">{progress.placement.overall}</span>
                      <Chip tone={progress.placement.provisional ? 'warn' : 'ok'}>
                        {progress.placement.provisional ? 'En revisión' : 'Confirmado'}
                      </Chip>
                    </span>
                  }
                />
              </Group>
              {progress.placement.provisional && (
                <p className="mt-2 px-5 text-[12px] leading-relaxed text-dim">
                  Una persona del equipo académico confirma tu nivel antes de que sea definitivo.
                </p>
              )}
            </section>
          )}

          <section className="rise rise-3">
            <SectionHeader>Competencias</SectionHeader>
            <Group>
              <Row
                icon="check"
                iconColor="bg-primary"
                title="Críticas dominadas"
                subtitle="La puerta de etapa exige el 100%"
                trailing={
                  <span className="font-semibold tabular-nums text-ink">
                    {progress.criticalMastered} / {progress.criticalTotal}
                  </span>
                }
              />
              <Row
                icon="check"
                iconColor="bg-teal"
                title="Complementarias dominadas"
                subtitle="La puerta de etapa exige el 85%"
                trailing={
                  <span className="font-semibold tabular-nums text-ink">
                    {progress.complementaryMastered} / {progress.complementaryTotal}
                  </span>
                }
              />
            </Group>
          </section>
        </div>
      </div>

      <section className="rise rise-4">
        <SectionHeader>Por habilidad</SectionHeader>
        <Card className="grid flex-col gap-5 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3">
          {progress.perSkill.map((entry) => (
            <Meter
              key={entry.skill}
              label={SKILL_LABELS[entry.skill] ?? entry.skill}
              value={entry.total === 0 ? 0 : entry.mastered / entry.total}
              tone="blue"
              hint={`${entry.mastered} de ${entry.total} dominadas`}
            />
          ))}
        </Card>
      </section>
    </div>
  );
}
