import { redirect } from 'next/navigation';
import { apiFetchOrNull } from '@/lib/api';
import { Chip, Group, IconTile, SectionHeader, Wordmark } from '@/components/ui';
import { ReviewDecisionButtons } from '@/components/review-decision';

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

export default async function StaffPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [reviews, safetyCases] = await Promise.all([
    apiFetchOrNull<ReviewRow[]>('/human-reviews?status=pending'),
    apiFetchOrNull<SafetyRow[]>('/admin/safety/cases'),
  ]);
  if (reviews === null) redirect(`/${locale}/login`);

  return (
    <div className="min-h-dvh">
      <header className="material-bar sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
          <Wordmark />
          <a href={`/${locale}/studio`} className="text-[15px] font-medium text-primary">
            Estudio de contenido
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
        <div className="rise mb-7">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink">
            Consola académica
          </h1>
          <p className="mt-1 text-[15px] leading-relaxed text-dim">
            Las decisiones significativas de menores permanecen provisionales hasta que una persona
            las confirme, corrija o invalide (D.S. 115-2025-PCM, art. 24–25).
          </p>
        </div>

        <section className="rise rise-1">
          <SectionHeader>Revisión humana · pendientes</SectionHeader>
          {reviews.length === 0 ? (
            <div className="rounded-2xl bg-surface px-5 py-8 text-center text-[15px] text-dim shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              Sin casos pendientes.
            </div>
          ) : (
            <Group>
              {reviews.map((review) => (
                <div key={review.id} className="px-4 py-3.5">
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
                      <pre className="mt-2 overflow-x-auto rounded-xl bg-mist px-3 py-2 text-[12px] leading-relaxed text-dim">
                        {JSON.stringify(review.payload, null, 2)}
                      </pre>
                      <ReviewDecisionButtons reviewId={review.id} />
                    </div>
                  </div>
                </div>
              ))}
            </Group>
          )}
        </section>

        <section className="rise rise-2 mt-8">
          <SectionHeader>Casos de protección abiertos</SectionHeader>
          {(safetyCases ?? []).length === 0 ? (
            <div className="rounded-2xl bg-surface px-5 py-8 text-center text-[15px] text-dim shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              Sin señales abiertas.
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
                  </div>
                  <span className="shrink-0 text-[13px] tabular-nums text-dim">
                    {new Date(item.createdAt).toLocaleDateString('es-PE')}
                  </span>
                </div>
              ))}
            </Group>
          )}
        </section>
      </main>
    </div>
  );
}
