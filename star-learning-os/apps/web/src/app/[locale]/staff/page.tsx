import { redirect } from 'next/navigation';
import { apiFetchOrNull } from '@/lib/api';
import { Card, Chip, SectionTitle, Wordmark } from '@/components/ui';
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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="rise mb-8">
        <div className="mb-6 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-cyan" />
        <Wordmark />
        <h1 className="mt-4 font-display text-[1.75rem] font-semibold leading-tight text-ink">
          Consola académica
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-dim">
          Las decisiones significativas de menores permanecen provisionales hasta que una persona
          las confirme, corrija o invalide (D.S. 115-2025-PCM, art. 24–25).
        </p>
      </header>

      <SectionTitle className="mb-3">Cola de revisión humana</SectionTitle>
      <div className="flex flex-col gap-3">
        {reviews.length === 0 && (
          <Card className="px-4 py-5 text-center text-sm text-dim">Sin casos pendientes.</Card>
        )}
        {reviews.map((review) => (
          <Card key={review.id} accent className="rise px-5 py-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <Chip tone="primary">{CASE_LABELS[review.caseType] ?? review.caseType}</Chip>
              <span className="text-xs tabular-nums text-dim">
                {new Date(review.createdAt).toLocaleString('es-PE')}
              </span>
            </div>
            <p className="text-sm text-ink">
              <strong className="font-display font-semibold">{review.learner}</strong>
              {review.program ? <span className="text-dim"> · {review.program}</span> : ''}
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-paper px-3 py-2 text-xs leading-relaxed text-dim">
              {JSON.stringify(review.payload, null, 2)}
            </pre>
            <ReviewDecisionButtons reviewId={review.id} />
          </Card>
        ))}
      </div>

      <SectionTitle className="mb-3 mt-8">Casos de protección abiertos</SectionTitle>
      <div className="flex flex-col gap-3">
        {(safetyCases ?? []).length === 0 && (
          <Card className="px-4 py-5 text-center text-sm text-dim">Sin señales abiertas.</Card>
        )}
        {(safetyCases ?? []).map((item) => (
          <Card key={item.caseId ?? item.createdAt} className="flex items-center gap-3 px-4 py-3.5">
            <Chip tone={item.severity === 'p0' || item.severity === 'p1' ? 'risk' : 'warn'}>
              {item.severity.toUpperCase()}
            </Chip>
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-ink">
                {item.category} · <span className="text-dim">{item.learner}</span>
              </p>
              {item.excerpt && <p className="text-xs italic text-dim">“{item.excerpt}”</p>}
            </div>
            <span className="shrink-0 text-xs tabular-nums text-dim">
              {new Date(item.createdAt).toLocaleDateString('es-PE')}
            </span>
          </Card>
        ))}
      </div>
    </div>
  );
}
