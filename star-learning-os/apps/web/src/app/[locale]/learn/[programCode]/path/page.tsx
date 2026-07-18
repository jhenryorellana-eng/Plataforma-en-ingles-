import { redirect } from 'next/navigation';
import type { PathResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { rankFor } from '@/lib/ranks';

const PLANET_HUES = ['#2fe6ff', '#8a88ff', '#ff9ecf', '#ffb340', '#3dd771', '#4da3ff'];

const STATE_DOTS: Record<string, { label: string; color: string }> = {
  not_seen: { label: 'Pendiente', color: '#c7c7cc' },
  exposed: { label: 'Vista', color: '#b9b8cf' },
  developing: { label: 'En desarrollo', color: '#0a84ff' },
  provisional: { label: 'Casi dominada', color: '#17b8cd' },
  mastered: { label: 'Dominada', color: '#2fbf5f' },
  review_required: { label: 'Necesita repaso', color: '#ff9f0a' },
};

const SKILL_LABELS: Record<string, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  speaking: 'Oral',
  writing: 'Escritura',
  language_use: 'Idioma',
};

type UnitState = 'done' | 'current' | 'locked';

/** Planeta de una unidad: esfera degradada, cráteres y anillo de progreso. */
function Planet({
  hue,
  ratio,
  state,
  id,
}: {
  hue: string;
  ratio: number;
  state: UnitState;
  id: string;
}) {
  const circumference = 2 * Math.PI * 44;
  return (
    <svg viewBox="0 0 96 96" className="size-[88px] shrink-0" aria-hidden>
      <defs>
        <radialGradient id={`${id}-sphere`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="35%" stopColor={hue} />
          <stop offset="100%" stopColor={hue} stopOpacity="0.55" />
        </radialGradient>
      </defs>
      {state === 'current' && (
        <circle cx="48" cy="48" r="44" fill="none" stroke={hue} strokeWidth="3" className="planet-pulse" />
      )}
      <circle cx="48" cy="48" r="44" fill="var(--color-surface)" stroke="var(--color-fill)" strokeWidth="4.5" />
      <circle
        cx="48" cy="48" r="44" fill="none"
        stroke={state === 'locked' ? 'var(--color-fill)' : hue}
        strokeWidth="4.5" strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - ratio)}
        transform="rotate(-90 48 48)"
        className="ring-progress"
      />
      <circle
        cx="48" cy="48" r="33"
        fill={state === 'locked' ? 'var(--color-fill)' : `url(#${id}-sphere)`}
      />
      {state !== 'locked' && (
        <g fill="#00000022">
          <ellipse cx="38" cy="40" rx="7" ry="5" />
          <ellipse cx="58" cy="56" rx="5" ry="4" />
          <ellipse cx="52" cy="34" rx="3.5" ry="3" />
        </g>
      )}
      {state === 'done' && (
        <path d="M 34 49 L 44 59 L 63 38" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      )}
      {state === 'current' && (
        <path
          d="M 48 29 C 49.8 38.6 56.4 45.2 66 47 C 56.4 48.8 49.8 55.4 48 65 C 46.6 55.4 39.6 48.8 30 47 C 39.6 45.2 46.2 38.6 48 29 Z"
          fill="#ffffff"
        />
      )}
      {state === 'locked' && (
        <g stroke="var(--color-dim)" strokeWidth="4" fill="none" strokeLinecap="round">
          <rect x="34" y="46" width="28" height="21" rx="6" fill="var(--color-surface)" />
          <path d="M 39 46 V 40 a 9 9 0 0 1 18 0 v 6" />
        </g>
      )}
    </svg>
  );
}

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
  const units = path.stages.flatMap((stage) =>
    stage.units.map((unit) => ({ stage, unit })),
  );
  const totals = units.map(({ unit }) => {
    const mastered = unit.competencies.filter((c) => c.state === 'mastered').length;
    return {
      mastered,
      ratio: unit.competencies.length === 0 ? 0 : mastered / unit.competencies.length,
    };
  });
  const currentIndex = totals.findIndex((entry) => entry.ratio < 1);
  const allCompetencies = units.flatMap(({ unit }) => unit.competencies);
  const totalMastered = totals.reduce((sum, entry) => sum + entry.mastered, 0);
  const overallRatio = allCompetencies.length === 0 ? 0 : totalMastered / allCompetencies.length;
  const rank = rankFor(overallRatio);

  return (
    <div className="flex flex-col gap-7">
      <header className="rise">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink">
            Tu galaxia
          </h1>
          <span
            className="rounded-full px-3 py-1 text-[13px] font-bold"
            style={{ backgroundColor: `${rank.color}22`, color: rank.color }}
          >
            {rank.name}
          </span>
        </div>
        <p className="mt-1 text-[15px] leading-relaxed text-dim">
          Conquista cada planeta camino a Starbiz Global B2. El que brilla es tu próxima misión.
        </p>
      </header>

      <div className="relative flex flex-col gap-9 py-3">
        <span
          aria-hidden
          className="absolute bottom-4 left-[43px] top-4 w-[3px] rounded-full lg:left-1/2"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, var(--color-fill) 0 12px, transparent 12px 24px)',
          }}
        />
        {units.map(({ stage, unit }, index) => {
          const { mastered, ratio } = totals[index];
          const state: UnitState =
            ratio >= 1 ? 'done' : index === currentIndex ? 'current' : 'locked';
          const hue = PLANET_HUES[index % PLANET_HUES.length];
          const isRight = index % 2 === 1;
          return (
            <div
              key={unit.code}
              className={`rise relative flex items-start gap-4 lg:w-1/2 ${
                isRight ? 'lg:ml-auto lg:pl-16' : 'lg:flex-row-reverse lg:pr-16 lg:text-right'
              }`}
              style={{ animationDelay: `${Math.min(index * 0.08, 0.5)}s` }}
            >
              <div className={isRight ? 'lg:absolute lg:-left-11' : 'lg:absolute lg:-right-11'}>
                {state === 'current' && (
                  <span className="hint-bob absolute -top-8 left-1/2 z-20 whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                    Aquí vas
                  </span>
                )}
                <Planet hue={hue} ratio={ratio} state={state} id={`planet-${index}`} />
              </div>
              <div
                className={`card-shadow min-w-0 flex-1 rounded-3xl bg-surface ${
                  state === 'locked' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3.5">
                  <p className="text-[13px] font-bold uppercase tracking-wide text-dim">
                    {stage.name} · {unit.name}
                  </p>
                  <p className="text-[13px] font-semibold tabular-nums text-dim">
                    {mastered}/{unit.competencies.length}
                  </p>
                </div>
                <div className="flex flex-col px-5 py-2">
                  {unit.competencies.map((competency) => {
                    const dot = STATE_DOTS[competency.state] ?? STATE_DOTS.not_seen;
                    return (
                      <div key={competency.code} className="flex items-start gap-3 py-2.5">
                        <span
                          className="mt-1.5 size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: dot.color }}
                        />
                        <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
                          {competency.descriptor}{' '}
                          <span className="text-[12px] text-dim">
                            · {SKILL_LABELS[competency.skill]}
                            {competency.criticality === 'critical' ? ' · Crítica' : ''}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="rise px-5 text-center text-[12px] leading-relaxed text-dim">
        La puerta de etapa exige el 100% de competencias críticas y el 85% de complementarias — sin
        promedios que escondan debilidades.
      </p>
    </div>
  );
}
