import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { apiFetchOrNull } from '@/lib/api';
import {
  Card,
  Chip,
  EmptyState,
  Group,
  Icon,
  IconTile,
  SectionHeader,
  Wordmark,
  type IconName,
} from '@/components/ui';
import { ReviewDecisionButtons } from '@/components/review-decision';
import { SafetyCaseActions } from '@/components/safety-case-actions';
import { StaffTutorial } from '@/components/staff-tutorial';

interface ReviewRow {
  id: string;
  caseType: string;
  learner: string;
  ageBand: string | null;
  program: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

interface SafetyRow {
  caseId: string | null;
  severity: string;
  category: string;
  status: 'open' | 'triaged';
  assignee: string | null;
  learner: string;
  excerpt: string | null;
  createdAt: string;
}

type LearnerStatus = 'on_track' | 'needs_practice' | 'needs_support' | 'awaiting_start';

interface CompanionOverview {
  summary: {
    learners: number;
    needAttention: number;
    pendingReviews: number;
    openSafetyCases: number;
  };
  learners: Array<{
    learnerId: string;
    enrollmentId: string;
    displayName: string;
    ageLabel: string;
    program: string;
    level: string;
    status: LearnerStatus;
    focus: string;
    progressPercent: number;
    lastActivityAt: string | null;
    recommendation: string;
  }>;
}

interface StudioOverview {
  authoringProvider: string;
  stats: {
    publishedLessons: number;
    draftLessons: number;
    competenciesTotal: number;
    competenciesCovered: number;
  };
}

const CASE_LABELS: Record<string, string> = {
  placement: 'Confirmar el nivel inicial',
  stage_gate: 'Confirmar el avance de etapa',
  integrity: 'Revisar una evidencia',
  readiness: 'Confirmar que está listo para avanzar',
  certificate: 'Revisar una certificación',
  low_confidence: 'El resultado no es suficientemente claro',
  appeal: 'Revisar una solicitud',
};

const SKILL_LABELS: Record<string, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  speaking: 'Expresión oral',
  writing: 'Escritura',
  language_use: 'Gramática y vocabulario',
};

const STATUS_META: Record<
  LearnerStatus,
  { label: string; tone: 'ok' | 'warn' | 'risk' | 'primary'; icon: IconName; color: string }
> = {
  on_track: { label: 'Avanza bien', tone: 'ok', icon: 'check', color: 'bg-ok' },
  needs_practice: {
    label: 'Necesita práctica',
    tone: 'warn',
    icon: 'review',
    color: 'bg-gold',
  },
  needs_support: {
    label: 'Necesita apoyo',
    tone: 'risk',
    icon: 'shield',
    color: 'bg-risk',
  },
  awaiting_start: {
    label: 'Primeros pasos',
    tone: 'primary',
    icon: 'route',
    color: 'bg-primary',
  },
};

interface ProposedPlacement {
  overall?: string;
  perSkill?: Record<string, string>;
  confidence?: number;
  provisional?: boolean;
}

function ReviewSummary({ payload }: { payload: Record<string, unknown> }) {
  const proposed = payload.proposed as ProposedPlacement | undefined;
  if (!proposed || typeof proposed !== 'object') {
    return (
      <p className="mt-3 rounded-xl bg-mist px-4 py-3 text-[13px] leading-relaxed text-dim">
        El sistema encontró una decisión que necesita criterio humano antes de continuar.
      </p>
    );
  }
  return (
    <div className="mt-3 rounded-xl bg-mist px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[12px] font-bold uppercase tracking-wide text-dim">
          Nivel sugerido
        </span>
        <span className="text-[24px] font-extrabold leading-none text-primary">
          {proposed.overall ?? 'Por definir'}
        </span>
        {proposed.provisional && <Chip tone="warn">Necesita confirmación</Chip>}
      </div>
      {proposed.perSkill && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(proposed.perSkill).map(([skill, band]) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink"
            >
              <span className="text-dim">{SKILL_LABELS[skill] ?? skill}</span>
              {band}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-dim">
        Revisa si esta recomendación representa lo que el estudiante realmente puede hacer.
      </p>
    </div>
  );
}

function SummaryCard({
  icon,
  color,
  value,
  label,
  helper,
}: {
  icon: IconName;
  color: string;
  value: number;
  label: string;
  helper: string;
}) {
  return (
    <Card className="flex min-h-32 flex-col justify-between px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <IconTile name={icon} color={color} />
        <span className="text-[31px] font-extrabold leading-none tabular-nums text-ink">{value}</span>
      </div>
      <div className="mt-4">
        <p className="text-[14px] font-bold text-ink">{label}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-dim">{helper}</p>
      </div>
    </Card>
  );
}

function StaffNav({
  locale,
  canReview,
  canAuthor,
  canSafeguard,
}: {
  locale: string;
  canReview: boolean;
  canAuthor: boolean;
  canSafeguard: boolean;
}) {
  return (
    <nav aria-label="Secciones del panel" className="border-b border-line bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
        <a href="#inicio" className="rounded-full bg-primary-soft px-3.5 py-2 text-[13px] font-bold text-primary">
          Inicio
        </a>
        {canReview && (
          <a href="#alumnos" className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-dim hover:bg-mist">
            Alumnos
          </a>
        )}
        {canAuthor && (
          <Link
            href={`/${locale}/studio`}
            className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-dim hover:bg-mist"
          >
            Actividades
          </Link>
        )}
        {canSafeguard && (
          <a href="#alertas" className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-dim hover:bg-mist">
            Alertas
          </a>
        )}
      </div>
    </nav>
  );
}

export default async function StaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const me = await apiFetchOrNull<MeResponse>('/auth/me');
  if (!me || me.role !== 'staff') redirect(`/${locale}/login`);

  const canReview = me.capabilities.includes('academic_reviewer');
  const canSafeguard = me.capabilities.includes('safeguarding');
  const canAuthor = me.capabilities.includes('curriculum_author');
  const [overview, reviews, safetyCases, studio] = await Promise.all([
    canReview
      ? apiFetchOrNull<CompanionOverview>('/companion/overview')
      : Promise.resolve(null),
    canReview ? apiFetchOrNull<ReviewRow[]>('/human-reviews?status=pending') : Promise.resolve(null),
    canSafeguard ? apiFetchOrNull<SafetyRow[]>('/admin/safety/cases') : Promise.resolve(null),
    canAuthor ? apiFetchOrNull<StudioOverview>('/studio/overview') : Promise.resolve(null),
  ]);

  const attentionLearners = overview?.learners.filter((learner) => learner.status !== 'on_track') ?? [];
  const calmDay =
    (reviews ?? []).length === 0 && (safetyCases ?? []).length === 0 && attentionLearners.length === 0;
  const firstName = me.displayName.replace(/^Prof\.\s*/i, '').split(/\s+/)[0] || me.displayName;

  return (
    <div className="min-h-dvh bg-paper">
      <header className="material-bar sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <Wordmark />
          <div className="flex items-center gap-2.5">
            <span className="hidden text-[13px] font-semibold text-dim sm:inline">
              Panel de acompañamiento
            </span>
            <StaffTutorial
              staffId={me.id}
              canReview={canReview}
              canAuthor={canAuthor}
              canSafeguard={canSafeguard}
            />
          </div>
        </div>
        <StaffNav
          locale={locale}
          canReview={canReview}
          canAuthor={canAuthor}
          canSafeguard={canSafeguard}
        />
      </header>

      <main id="inicio" className="mx-auto max-w-6xl scroll-mt-28 px-4 pb-20 pt-7">
        <section className="rise rounded-[28px] border border-primary/10 bg-[linear-gradient(135deg,var(--color-surface),var(--color-primary-soft))] px-5 py-6 shadow-[0_18px_50px_rgba(94,92,230,0.10)] sm:px-7">
          <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-primary">
            Tu jornada
          </p>
          <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink sm:text-[40px]">
                Hola, {firstName}.
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-dim">
                {calmDay
                  ? 'Todo avanza con normalidad. Hoy no hay situaciones urgentes.'
                  : 'Aquí encontrarás solamente lo que necesita tu atención. El resto del aprendizaje continúa automáticamente.'}
              </p>
            </div>
            <Chip tone={calmDay ? 'ok' : 'warn'}>
              {calmDay ? 'Día al corriente' : 'Hay pendientes para revisar'}
            </Chip>
          </div>
        </section>

        <section
          data-staff-tour="summary"
          className="rise rise-1 mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <SummaryCard
            icon="review"
            color={attentionLearners.length > 0 ? 'bg-gold' : 'bg-ok'}
            value={attentionLearners.length}
            label="Alumnos por acompañar"
            helper="Situaciones que merecen una mirada humana."
          />
          <SummaryCard
            icon="shield"
            color={(reviews ?? []).length > 0 ? 'bg-primary' : 'bg-ok'}
            value={(reviews ?? []).length}
            label="Resultados por confirmar"
            helper="Decisiones que todavía no son definitivas."
          />
          <SummaryCard
            icon="book"
            color={(studio?.stats.draftLessons ?? 0) > 0 ? 'bg-gold' : 'bg-blue'}
            value={studio?.stats.draftLessons ?? 0}
            label="Actividades en borrador"
            helper="Contenido que aún no ha llegado a los alumnos."
          />
        </section>

        {canReview && (
          <section className="rise rise-2 mt-9">
            <div data-staff-tour="reviews">
              <SectionHeader>Qué hacer hoy</SectionHeader>
            </div>
            {(reviews ?? []).length === 0 ? (
              <Card>
                <EmptyState
                  icon="check"
                  iconColor="bg-ok"
                  title="No hay resultados esperando tu decisión"
                  body="Cuando una evaluación necesite criterio humano, aparecerá aquí con una explicación sencilla."
                />
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {(reviews ?? []).map((review) => (
                  <Card key={review.id} className="px-5 py-5">
                    <div className="flex items-start gap-3.5">
                      <IconTile name="review" color="bg-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[16px] font-bold text-ink">
                            {CASE_LABELS[review.caseType] ?? 'Revisar un resultado'}
                          </p>
                          <span className="text-[12px] tabular-nums text-dim">
                            {new Date(review.createdAt).toLocaleDateString('es-PE')}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[14px] text-dim">
                          {review.learner}
                          {review.program ? ` · ${review.program}` : ''}
                        </p>
                      </div>
                    </div>
                    <ReviewSummary payload={review.payload} />
                    <ReviewDecisionButtons reviewId={review.id} />
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {canReview && (
          <section
            id="alumnos"
            className="rise rise-3 mt-10 scroll-mt-32"
          >
            <div
              data-staff-tour="learners"
              className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1"
            >
              <div>
                <p className="text-[13px] font-medium uppercase tracking-wide text-dim">Alumnos</p>
                <h2 className="text-[24px] font-extrabold text-ink">Una vista fácil de entender</h2>
              </div>
              <p className="text-[13px] text-dim">
                {overview?.summary.learners ?? 0} con una ruta de aprendizaje
              </p>
            </div>

            {(overview?.learners ?? []).length === 0 ? (
              <Card>
                <EmptyState
                  icon="route"
                  iconColor="bg-primary"
                  title="Todavía no hay rutas para acompañar"
                  body="Los alumnos aparecerán aquí después de iniciar su programa."
                />
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {(overview?.learners ?? []).map((learner) => {
                  const meta = STATUS_META[learner.status];
                  return (
                    <Card key={learner.enrollmentId} className="overflow-hidden">
                      <div className="flex items-start gap-3.5 px-5 py-4">
                        <IconTile name={meta.icon} color={meta.color} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[16px] font-bold text-ink">{learner.displayName}</p>
                              <p className="text-[12px] text-dim">
                                {learner.ageLabel} · {learner.program} · Nivel {learner.level}
                              </p>
                            </div>
                            <Chip tone={meta.tone}>{meta.label}</Chip>
                          </div>
                          <p className="mt-3 text-[13px] leading-relaxed text-ink">
                            {learner.recommendation}
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-line bg-mist/45 px-5 py-3">
                        <div className="flex items-center justify-between gap-3 text-[12px]">
                          <span className="font-semibold text-dim">
                            Recorrido completado
                          </span>
                          <span className="font-bold tabular-nums text-ink">
                            {learner.progressPercent}%
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(3, learner.progressPercent)}%` }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-dim">
                          <span>Enfoque actual: {learner.focus}</span>
                          <span>
                            {learner.lastActivityAt
                              ? `Última práctica: ${new Date(learner.lastActivityAt).toLocaleDateString('es-PE')}`
                              : 'Aún sin prácticas registradas'}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {canAuthor && (
          <section data-staff-tour="activities" className="rise mt-10">
            <SectionHeader>Actividades</SectionHeader>
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center">
                <IconTile name="book" color="bg-blue" className="size-11 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-bold text-ink">Preparar una práctica</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-dim">
                    Elige qué quieres practicar y revisa el resultado antes de compartirlo. No
                    necesitas configurar ninguna herramienta técnica.
                  </p>
                  {studio && (
                    <p className="mt-2 text-[12px] text-dim">
                      {studio.stats.publishedLessons} actividades publicadas ·{' '}
                      {studio.stats.draftLessons} en borrador
                    </p>
                  )}
                </div>
                <Link
                  href={`/${locale}/studio`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-[14px] font-bold text-white"
                >
                  Abrir actividades
                  <Icon name="arrow" className="size-4" />
                </Link>
              </div>
              <p className="border-t border-line bg-mist/45 px-5 py-3 text-[12px] leading-relaxed text-dim">
                Para proteger la calidad, una persona diferente debe aprobar el contenido antes de
                publicarlo.
              </p>
            </Card>
          </section>
        )}

        {canSafeguard && (
          <section
            id="alertas"
            className="rise mt-10 scroll-mt-32"
          >
            <div data-staff-tour="alerts">
              <SectionHeader>Alertas importantes</SectionHeader>
            </div>
            {(safetyCases ?? []).length === 0 ? (
              <Card>
                <EmptyState
                  icon="check"
                  iconColor="bg-ok"
                  title="No hay avisos de bienestar abiertos"
                  body="Esta sección está separada del progreso académico y solo aparece para personal autorizado."
                />
              </Card>
            ) : (
              <Group>
                {(safetyCases ?? []).map((item) => (
                  <div
                    key={item.caseId ?? item.createdAt}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start"
                  >
                    <Chip tone={item.severity === 'p0' || item.severity === 'p1' ? 'risk' : 'warn'}>
                      {item.severity === 'p0' || item.severity === 'p1'
                        ? 'Atención prioritaria'
                        : 'Revisar aviso'}
                    </Chip>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-ink">
                        {item.learner} necesita acompañamiento
                      </p>
                      <p className="mt-1 text-[13px] leading-relaxed text-dim">
                        Categoría: {item.category}. Revisa solamente la información necesaria para
                        atender el caso.
                      </p>
                      {item.excerpt && (
                        <p className="mt-2 rounded-xl bg-mist px-3 py-2 text-[13px] text-dim">
                          “{item.excerpt}”
                        </p>
                      )}
                      {item.caseId && (
                        <SafetyCaseActions caseId={item.caseId} status={item.status} />
                      )}
                    </div>
                    <span className="text-[12px] tabular-nums text-dim">
                      {new Date(item.createdAt).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                ))}
              </Group>
            )}
          </section>
        )}

        {!canReview && !canSafeguard && !canAuthor && (
          <Card className="mt-8">
            <EmptyState
              icon="shield"
              iconColor="bg-fill"
              title="Tu acceso está listo, pero aún no tiene tareas asignadas"
              body="Un responsable de operaciones debe habilitar las secciones que necesitas."
            />
          </Card>
        )}
      </main>
    </div>
  );
}
