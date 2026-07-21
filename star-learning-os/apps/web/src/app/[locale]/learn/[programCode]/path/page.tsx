import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { PathResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { rankFor } from '@/lib/ranks';
import { AuroraHero } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';
import { Icon } from '@/components/ui';

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
  const resolution = await resolveEnrollment(programCode);
  if (resolution.kind === 'anonymous') redirect(`/${locale}/login`);
  if (resolution.kind === 'no-enrollment') redirect(`/${locale}/enroll`);
  const enrollment = resolution.enrollment;
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
  const activeUnit = currentIndex === -1 ? undefined : units[currentIndex];

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="rise">
        <AuroraHero
          asset="starmap"
          eyebrow="Mapa de dominio · Expedición Aurora"
          title="Ruta Estelar"
          body={
            <>
              <p>
                {activeUnit
                  ? `Tu siguiente estación es ${activeUnit.stage.name} · ${activeUnit.unit.name}.`
                  : 'Conquistaste todas las estaciones disponibles de esta ruta.'}
              </p>
              <div className="mt-3 max-w-[19rem]">
                <div className="h-2.5 overflow-hidden rounded-full bg-white/15 p-[2px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7f8cff] via-[#53d8ee] to-[#ffd35a] transition-[width] duration-700"
                    style={{ width: `${Math.round(overallRatio * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white/70">
                  {Math.round(overallRatio * 100)}% · {totalMastered} de {allCompetencies.length} dominadas
                </p>
              </div>
            </>
          }
          badge={
            <span
              className="rounded-full border border-white/15 bg-[#071525]/75 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] shadow-lg backdrop-blur-md"
              style={{ color: rank.color }}
            >
              {rank.name}
            </span>
          }
          tone="gold"
          compact
          priority
          imageAlt="Archipiélago de estaciones estelares unido por una ruta luminosa"
        />
      </div>

      <div className="rise rise-1">
        <NovaGuide compact state={activeUnit ? 'idle' : 'celebrate'}>
          {activeUnit
            ? 'Busca el planeta que pulsa: esa es la estación donde tu evidencia puede crecer ahora.'
            : 'Tu constelación está completa. Cada planeta conserva la evidencia de lo que dominaste.'}
        </NovaGuide>
      </div>

      <div className="relative flex flex-col gap-7 py-3 sm:gap-9">
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
          const visibleCompetencies =
            state === 'current'
              ? unit.competencies.filter((competency) => competency.state !== 'mastered').slice(0, 3)
              : [];
          return (
            <div
              key={unit.code}
              className={`rise relative flex items-start gap-4 lg:w-1/2 ${
                isRight ? 'lg:ml-auto lg:pl-16' : 'lg:flex-row-reverse lg:pr-16'
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
                className={`mission-panel min-w-0 flex-1 overflow-hidden rounded-[24px] ${
                  state === 'locked' ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
                  <p className="mission-kicker text-[9px] text-dim">
                    {stage.name} · {unit.name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide ${
                      state === 'done'
                        ? 'bg-ok-soft text-ok-deep'
                        : state === 'current'
                          ? 'bg-primary-soft text-primary-deep'
                          : 'bg-fill text-dim'
                    }`}
                  >
                    {state === 'done' ? 'Dominada' : state === 'current' ? 'Actual' : 'Bloqueada'}
                  </span>
                </div>
                <div className="px-4 pb-3 pt-3 sm:px-5">
                  <div className="h-2 overflow-hidden rounded-full bg-fill">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${state === 'locked' ? 0 : ratio * 100}%`,
                        backgroundColor: hue,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold tabular-nums text-dim">
                    {mastered} de {unit.competencies.length} competencias
                  </p>
                </div>
                <div className="flex flex-col border-t border-line px-4 py-2 sm:px-5">
                  {visibleCompetencies.map((competency) => {
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
                            {' · '}{dot.label}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                  {state === 'done' && (
                    <p className="py-3 text-[13px] font-semibold text-ok-deep">
                      Estación completada. Tu evidencia quedó guardada.
                    </p>
                  )}
                  {state === 'locked' && (
                    <p className="py-3 text-[13px] leading-relaxed text-dim">
                      Completa la estación anterior para abrir esta parte de la ruta.
                    </p>
                  )}
                  {state === 'current' && visibleCompetencies.length === 0 && (
                    <p className="py-3 text-[13px] text-dim">Preparando tu siguiente competencia.</p>
                  )}
                </div>
                {state === 'current' && (
                  <Link
                    href={`/${locale}/learn/${programCode}/today`}
                    className="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] font-extrabold text-primary-deep transition-colors hover:bg-primary-soft sm:px-5"
                  >
                    Continuar desde Hoy
                    <Icon name="arrow" className="size-4" />
                  </Link>
                )}
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
