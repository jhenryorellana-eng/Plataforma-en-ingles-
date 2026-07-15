import { redirect } from 'next/navigation';
import type { PathResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Chip, Group, Ring, SectionHeader } from '@/components/ui';

const STATE_META: Record<string, { label: string; value: number; color: string }> = {
  not_seen: { label: 'Pendiente', value: 0.03, color: '#c7c7cc' },
  exposed: { label: 'Vista', value: 0.15, color: '#c7c7cc' },
  developing: { label: 'En desarrollo', value: 0.45, color: '#0a84ff' },
  provisional: { label: 'Casi dominada', value: 0.8, color: '#30b0c7' },
  mastered: { label: 'Dominada', value: 1, color: '#34c759' },
  review_required: { label: 'Necesita repaso', value: 0.8, color: '#ff9f0a' },
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
      <header className="rise">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink">Ruta</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-dim">
          Hacia Starbiz Global B2. Cada competencia se domina con producción propia, transferencia
          y memoria a largo plazo.
        </p>
      </header>

      {path.stages.map((stage) => (
        <section key={stage.code} className="rise rise-1 flex flex-col gap-5">
          {stage.units.map((unit) => (
            <div key={unit.code}>
              <SectionHeader>
                {stage.name} · {unit.name}
              </SectionHeader>
              <Group>
                {unit.competencies.map((competency) => {
                  const meta = STATE_META[competency.state] ?? STATE_META.not_seen;
                  return (
                    <div key={competency.code} className="flex items-center gap-3.5 px-4 py-3">
                      <Ring value={meta.value} size={34} strokeWidth={4.5} color={meta.color} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-snug text-ink">{competency.descriptor}</p>
                        <p className="mt-0.5 text-[13px] text-dim">
                          {SKILL_LABELS[competency.skill]}
                          {competency.criticality === 'critical' ? ' · Crítica' : ''}
                        </p>
                      </div>
                      <Chip
                        tone={
                          competency.state === 'mastered'
                            ? 'ok'
                            : competency.state === 'review_required'
                              ? 'warn'
                              : competency.state === 'developing' || competency.state === 'provisional'
                                ? 'primary'
                                : 'default'
                        }
                      >
                        {meta.label}
                      </Chip>
                    </div>
                  );
                })}
              </Group>
            </div>
          ))}
        </section>
      ))}

      <p className="rise rise-2 px-5 text-center text-[12px] leading-relaxed text-dim">
        La puerta de etapa exige el 100% de competencias críticas y el 85% de complementarias — sin
        promedios que escondan debilidades.
      </p>
    </div>
  );
}
