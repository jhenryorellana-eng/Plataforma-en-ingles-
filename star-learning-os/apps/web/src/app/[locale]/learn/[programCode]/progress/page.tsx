import { redirect } from 'next/navigation';
import type { ProgressResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Card, Chip, Group, Meter, RingCluster, Row, SectionHeader } from '@/components/ui';

const SKILL_LABELS: Record<string, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  speaking: 'Expresión oral',
  writing: 'Escritura',
  language_use: 'Uso del idioma',
};

const RING_COLORS = {
  coverage: '#0a84ff',
  mastery: '#5e5ce6',
  retention: '#30b0c7',
  readiness: '#34c759',
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
    { key: 'Cobertura', value: progress.coverage, color: RING_COLORS.coverage, hint: 'del mapa recorrido' },
    { key: 'Dominio', value: progress.mastery, color: RING_COLORS.mastery, hint: 'demostrado con evidencia' },
    { key: 'Retención', value: progress.retention, color: RING_COLORS.retention, hint: 'sigue fresco en memoria' },
    { key: 'Readiness', value: progress.readiness, color: RING_COLORS.readiness, hint: 'simulacros S4 · aún no aplica' },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header className="rise">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink">Progreso</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-dim">
          Cuatro medidas separadas — recorrer contenido no es dominarlo.
        </p>
      </header>

      <Card className="rise rise-1 px-5 py-6">
        <div className="flex items-center gap-6">
          <RingCluster
            size={172}
            rings={legend.map((entry) => ({ value: entry.value, color: entry.color }))}
          />
          <ul className="flex min-w-0 flex-1 flex-col gap-3">
            {legend.map((entry) => (
              <li key={entry.key} className="flex items-baseline gap-2.5">
                <span className="size-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ backgroundColor: entry.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold text-ink">{entry.key}</span>
                    <span className="text-[15px] font-semibold tabular-nums" style={{ color: entry.color }}>
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

      <section className="rise rise-4">
        <SectionHeader>Por habilidad</SectionHeader>
        <Card className="flex flex-col gap-5 px-5 py-5">
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
