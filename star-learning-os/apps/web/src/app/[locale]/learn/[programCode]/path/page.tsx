import { redirect } from 'next/navigation';
import type { PathResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Card, Chip, SectionTitle } from '@/components/ui';

const STATE_LABELS: Record<string, string> = {
  not_seen: 'Por descubrir',
  exposed: 'Vista',
  developing: 'En desarrollo',
  provisional: 'Casi dominada',
  mastered: 'Dominada',
  review_required: 'Necesita repaso',
};

const SKILL_LABELS: Record<string, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  speaking: 'Oral',
  writing: 'Escritura',
  language_use: 'Idioma',
};

export default async function PathPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  const enrollment = await resolveEnrollment(programCode);
  if (!enrollment) redirect(`/${locale}/login`);
  if (enrollment.status === 'pending_diagnostic') redirect(`/${locale}/learn/${programCode}/diagnostic`);

  const path = await apiFetch<PathResponse>(`/enrollments/${enrollment.id}/path`);

  return (
    <div className="flex flex-col gap-6">
      <section className="rise">
        <p className="text-sm text-dim">Tu constelación</p>
        <h1 className="font-display text-2xl font-semibold">
          Ruta a <span className="text-star">Starbiz Global B2</span>
        </h1>
        <p className="mt-1 text-sm text-dim">
          Cada estrella es una competencia. Se enciende cuando la dominas de verdad: con producción
          propia, transferencia y memoria a largo plazo.
        </p>
      </section>

      {path.stages.map((stage) => (
        <section key={stage.code} className="rise rise-1 flex flex-col gap-3">
          <SectionTitle>{stage.name}</SectionTitle>
          {stage.units.map((unit) => (
            <Card key={unit.code} className="px-4 py-4">
              <p className="mb-3 font-medium">{unit.name}</p>
              <ul className="flex flex-col gap-3">
                {unit.competencies.map((competency) => (
                  <li key={competency.code} className="flex items-start gap-3">
                    <span
                      className="star-node mt-1 inline-block size-3 shrink-0 rounded-full"
                      data-state={competency.state}
                      aria-hidden
                    />
                    <div className="flex-1">
                      <p className="text-sm leading-snug">{competency.descriptor}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Chip tone={competency.state === 'mastered' ? 'star' : 'default'}>
                          {STATE_LABELS[competency.state]}
                        </Chip>
                        <Chip>{SKILL_LABELS[competency.skill]}</Chip>
                        {competency.criticality === 'critical' && <Chip tone="nova">Crítica</Chip>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </section>
      ))}

      <p className="rise rise-2 text-center text-xs text-dim">
        La puerta de etapa exige 100% de críticas y 85% de complementarias — sin promedios que
        escondan debilidades.
      </p>
    </div>
  );
}
