import { redirect } from 'next/navigation';
import type { PathResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Card, Chip, SectionTitle } from '@/components/ui';

const STATE_LABELS: Record<string, string> = {
  not_seen: 'Pendiente',
  exposed: 'Vista',
  developing: 'En desarrollo',
  provisional: 'Casi dominada',
  mastered: 'Dominada',
  review_required: 'Necesita repaso',
};

const STATE_TONES: Record<string, 'default' | 'gold' | 'primary' | 'warn'> = {
  not_seen: 'default',
  exposed: 'default',
  developing: 'primary',
  provisional: 'gold',
  mastered: 'gold',
  review_required: 'warn',
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
    <div className="flex flex-col gap-7">
      <section className="rise">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim">Tu ruta medible</p>
        <h1 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight text-ink">
          Hacia Starbiz Global B2
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-dim">
          Cada punto es una competencia verificable. Se marca como dominada solo con producción
          propia, transferencia a contextos nuevos y memoria a largo plazo.
        </p>
      </section>

      {path.stages.map((stage) => (
        <section key={stage.code} className="rise rise-1 flex flex-col gap-3">
          <SectionTitle>{stage.name}</SectionTitle>
          {stage.units.map((unit) => (
            <Card key={unit.code} className="px-5 py-4">
              <p className="mb-4 font-display text-base font-semibold text-ink">{unit.name}</p>
              <ol className="relative ml-[7px] flex flex-col gap-5 border-l border-line pl-5">
                {unit.competencies.map((competency) => (
                  <li key={competency.code} className="relative">
                    <span
                      className="route-node absolute -left-[27px] top-0.5 inline-block size-3.5 rounded-full"
                      data-state={competency.state}
                      aria-hidden
                    />
                    <p className="text-sm leading-snug text-ink">{competency.descriptor}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Chip tone={STATE_TONES[competency.state]}>
                        {STATE_LABELS[competency.state]}
                      </Chip>
                      <Chip>{SKILL_LABELS[competency.skill]}</Chip>
                      {competency.criticality === 'critical' && <Chip tone="primary">Crítica</Chip>}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </section>
      ))}

      <p className="rise rise-2 border-t border-line pt-4 text-center text-xs leading-relaxed text-dim">
        La puerta de etapa exige el 100% de competencias críticas y el 85% de complementarias — sin
        promedios que escondan debilidades.
      </p>
    </div>
  );
}
