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
    <div className="flex flex-col gap-6">
      <section className="rise">
        <p className="text-sm text-dim">Progreso honesto</p>
        <h1 className="font-display text-2xl font-semibold">Cuatro medidas, nunca una sola</h1>
        <p className="mt-1 text-sm text-dim">
          Recorrer contenido no es dominarlo. Por eso cobertura, dominio, retención y readiness se
          miden por separado.
        </p>
      </section>

      {progress.placement && (
        <Card className="rise rise-1 flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-dim">Nivel estimado</p>
            <p className="font-display text-xl font-semibold text-star">{progress.placement.overall}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Chip tone={progress.placement.provisional ? 'warn' : 'ok'}>
              {progress.placement.provisional ? 'Provisional · en revisión humana' : 'Confirmado'}
            </Chip>
            <span className="text-xs text-dim">
              Confianza {Math.round(progress.placement.confidence * 100)}%
            </span>
          </div>
        </Card>
      )}

      <Card className="rise rise-2 flex flex-col gap-5 px-4 py-5">
        <Meter
          label="Cobertura"
          value={progress.coverage}
          tone="nova"
          hint="Cuánto del mapa has recorrido"
        />
        <Meter
          label="Dominio"
          value={progress.mastery}
          tone="star"
          hint="Lo que demostraste saber hacer, con evidencia"
        />
        <Meter
          label="Retención"
          value={progress.retention}
          tone="sky"
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
        <Card className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-dim">Críticas dominadas</span>
          <span className="font-display">
            {progress.criticalMastered} / {progress.criticalTotal}
          </span>
        </Card>
        <Card className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-dim">Complementarias dominadas</span>
          <span className="font-display">
            {progress.complementaryMastered} / {progress.complementaryTotal}
          </span>
        </Card>
      </section>

      <section className="rise rise-4 flex flex-col gap-3">
        <SectionTitle>Por habilidad</SectionTitle>
        <Card className="flex flex-col gap-4 px-4 py-4">
          {progress.perSkill.map((entry) => (
            <Meter
              key={entry.skill}
              label={SKILL_LABELS[entry.skill] ?? entry.skill}
              value={entry.total === 0 ? 0 : entry.mastered / entry.total}
              tone="star"
              hint={`${entry.mastered} de ${entry.total} dominadas`}
            />
          ))}
        </Card>
      </section>
    </div>
  );
}
