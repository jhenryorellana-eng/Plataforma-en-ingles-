import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { apiFetchOrNull } from '@/lib/api';
import { Chip, EmptyState, Group, IconTile, SectionHeader, Wordmark } from '@/components/ui';
import { ReviewDecisionButtons } from '@/components/review-decision';
import { SafetyCaseActions } from '@/components/safety-case-actions';

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

const CASE_LABELS: Record<string, string> = {
  placement: 'Placement definitivo',
  stage_gate: 'Puerta de etapa',
  integrity: 'Integridad',
  readiness: 'Readiness',
  certificate: 'Certificado',
  low_confidence: 'Baja confianza (Writing)',
  appeal: 'Apelación',
};

const SKILL_LABELS: Record<string, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  speaking: 'Oral',
  writing: 'Escritura',
  language_use: 'Uso del idioma',
};

interface ProposedPlacement {
  overall?: string;
  perSkill?: Record<string, string>;
  confidence?: number;
  provisional?: boolean;
}

/** Payload de revisión como UI: nivel por habilidad, confianza y campos legibles. */
function ReviewPayload({ payload }: { payload: Record<string, unknown> }) {
  const proposed = payload.proposed as ProposedPlacement | undefined;
  if (!proposed || typeof proposed !== 'object') {
    return (
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-xl bg-mist px-4 py-3 text-[13px]">
        {Object.entries(payload).map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="font-semibold text-dim">{key}</dt>
            <dd className="break-words text-ink">
              {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  const confidence = typeof proposed.confidence === 'number' ? proposed.confidence : null;
  return (
    <div className="mt-3 rounded-xl bg-mist px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[12px] font-bold uppercase tracking-wide text-dim">
          Nivel propuesto
        </span>
        <span className="text-[24px] font-extrabold leading-none text-primary">
          {proposed.overall ?? '—'}
        </span>
        {proposed.provisional && <Chip tone="warn">Provisional</Chip>}
        {confidence !== null && (
          <Chip tone={confidence >= 0.8 ? 'ok' : 'warn'}>
            Confianza {Math.round(confidence * 100)}%
          </Chip>
        )}
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
    </div>
  );
}

export default async function StaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const me = await apiFetchOrNull<MeResponse>('/auth/me');
  if (!me || me.role !== 'staff') redirect(`/${locale}/login`);
  const canReview = me.capabilities.includes('academic_reviewer');
  const canSafeguard = me.capabilities.includes('safeguarding');
  const canAuthor = me.capabilities.includes('curriculum_author');
  const [reviews, safetyCases] = await Promise.all([
    canReview ? apiFetchOrNull<ReviewRow[]>('/human-reviews?status=pending') : Promise.resolve(null),
    canSafeguard ? apiFetchOrNull<SafetyRow[]>('/admin/safety/cases') : Promise.resolve(null),
  ]);

  return (
    <div className="min-h-dvh">
      <header className="material-bar sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5 lg:max-w-6xl">
          <Wordmark />
          {canAuthor && (
            <Link href={`/${locale}/studio`} className="text-[15px] font-medium text-primary">
              Estudio de contenido
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 lg:max-w-6xl">
        <div className="rise mb-7">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink">
            Consola académica
          </h1>
          <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-dim">
            Las decisiones significativas de menores permanecen provisionales hasta que una persona
            las confirme, corrija o invalide (D.S. 115-2025-PCM, art. 24–25).
          </p>
        </div>

        {canReview && <section className="rise rise-1">
          <SectionHeader>Revisión humana · pendientes</SectionHeader>
          {(reviews ?? []).length === 0 ? (
            <div className="card-shadow rounded-2xl bg-surface">
              <EmptyState
                icon="shield"
                iconColor="bg-ok"
                title="Sin casos pendientes"
                body="Cuando el sistema proponga una decisión significativa, aparecerá aquí para tu confirmación."
              />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {(reviews ?? []).map((review) => (
                <div key={review.id} className="card-shadow rounded-2xl bg-surface px-5 py-4">
                  <div className="flex items-start gap-3.5">
                    <IconTile name="shield" color="bg-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[16px] font-semibold text-ink">
                          {CASE_LABELS[review.caseType] ?? review.caseType}
                        </p>
                        <span className="shrink-0 text-[13px] tabular-nums text-dim">
                          {new Date(review.createdAt).toLocaleDateString('es-PE')}
                        </span>
                      </div>
                      <p className="text-[14px] text-dim">
                        {review.learner}
                        {review.program ? ` · ${review.program}` : ''}
                      </p>
                    </div>
                  </div>
                  <ReviewPayload payload={review.payload} />
                  <ReviewDecisionButtons reviewId={review.id} />
                </div>
              ))}
            </div>
          )}
        </section>}

        {canSafeguard && <section className="rise rise-2 mt-8">
          <SectionHeader>Casos de protección abiertos</SectionHeader>
          {(safetyCases ?? []).length === 0 ? (
            <div className="card-shadow rounded-2xl bg-surface">
              <EmptyState
                icon="check"
                iconColor="bg-ok"
                title="Sin señales abiertas"
                body="Las alertas de protección aparecerán aquí con su severidad y categoría."
              />
            </div>
          ) : (
            <Group>
              {(safetyCases ?? []).map((item) => (
                <div key={item.caseId ?? item.createdAt} className="flex items-center gap-3.5 px-4 py-3">
                  <Chip tone={item.severity === 'p0' || item.severity === 'p1' ? 'risk' : 'warn'}>
                    {item.severity.toUpperCase()}
                  </Chip>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-ink">
                      {item.category} · <span className="text-dim">{item.learner}</span>
                    </p>
                    {item.excerpt && <p className="text-[13px] text-dim">“{item.excerpt}”</p>}
                    <p className="text-[12px] text-dim">
                      {item.status === 'triaged' ? 'Triado' : 'Abierto'}
                      {item.assignee ? ` · ${item.assignee}` : ''}
                    </p>
                    {item.caseId && <SafetyCaseActions caseId={item.caseId} status={item.status} />}
                  </div>
                  <span className="shrink-0 text-[13px] tabular-nums text-dim">
                    {new Date(item.createdAt).toLocaleDateString('es-PE')}
                  </span>
                </div>
              ))}
            </Group>
          )}
        </section>}

        {!canReview && !canSafeguard && !canAuthor && (
          <div className="card-shadow rounded-2xl bg-surface">
            <EmptyState
              icon="shield"
              iconColor="bg-fill"
              title="Sin módulos operativos asignados"
              body="Un responsable de operaciones debe asignarte una capacidad antes de continuar."
            />
          </div>
        )}
      </main>
    </div>
  );
}
