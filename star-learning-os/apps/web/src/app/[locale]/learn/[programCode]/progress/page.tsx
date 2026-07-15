import { redirect } from 'next/navigation';
import type { ProgressResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Card, Chip, Meter, SectionTitle } from '@/components/ui';

const SKILL_LABELS: Record<string, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  speaking: 'Expresión oral',
  writing: 'Escritura',
  language_use: 'Uso del idioma',
};

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

  return (
    <div className="flex flex-col gap-7">
      <section className="rise">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim">Reporte de avance</p>
        <h1 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight text-ink">
          Progreso honesto
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-dim">
          Recorrer contenido no es dominarlo. Por eso cobertura, dominio, retención y readiness se
          miden por separado.
        </p>
      </section>

      {progress.placement && (
        <Card accent className="rise rise-1 flex items-center justify-between px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim">Nivel estimado</p>
            <p className="text-gradient font-display text-3xl font-semibold">
              {progress.placement.overall}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Chip tone={progress.placement.provisional ? 'warn' : 'ok'}>
              {progress.placement.provisional ? 'Provisional · en revisión humana' : 'Confirmado por el equipo académico'}
            </Chip>
            <span className="text-xs tabular-nums text-dim">
              Confianza {Math.round(progress.placement.confidence * 100)}%
            </span>
          </div>
        </Card>
      )}

      <Card className="rise rise-2 flex flex-col gap-6 px-5 py-5">
        <Meter label="Cobertura" value={progress.coverage} tone="ink" hint="Cuánto del mapa has recorrido" />
        <Meter
          label="Dominio"
          value={progress.mastery}
          tone="gold"
          hint="Lo que demostraste saber hacer, con evidencia"
        />
        <Meter
          label="Retención"
          value={progress.retention}
          tone="primary"
          hint="Lo dominado que sigue fresco en tu memoria"
        />
        <Meter
          label="Readiness TOEFL"
          value={progress.readiness}
          tone="ok"
          hint="Se activa con los simulacros de la etapa S4 — aún no aplica"
        />
      </Card>

      <section className="rise rise-3 flex flex-col gap-3">
        <SectionTitle>Competencias</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Card className="px-4 py-4">
            <p className="text-xs text-dim">Críticas dominadas</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
              {progress.criticalMastered}
              <span className="text-base font-medium text-dim"> / {progress.criticalTotal}</span>
            </p>
          </Card>
          <Card className="px-4 py-4">
            <p className="text-xs text-dim">Complementarias</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
              {progress.complementaryMastered}
              <span className="text-base font-medium text-dim"> / {progress.complementaryTotal}</span>
            </p>
          </Card>
        </div>
      </section>

      <section className="rise rise-4 flex flex-col gap-3">
        <SectionTitle>Por habilidad</SectionTitle>
        <Card className="flex flex-col gap-5 px-5 py-5">
          {progress.perSkill.map((entry) => (
            <Meter
              key={entry.skill}
              label={SKILL_LABELS[entry.skill] ?? entry.skill}
              value={entry.total === 0 ? 0 : entry.mastered / entry.total}
              tone="primary"
              hint={`${entry.mastered} de ${entry.total} dominadas`}
            />
          ))}
        </Card>
      </section>
    </div>
  );
}
