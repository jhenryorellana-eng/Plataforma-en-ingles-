import { redirect } from 'next/navigation';
import { apiFetchOrNull } from '@/lib/api';
import { Card, Chip, InitialsAvatar, Meter, SectionTitle, Wordmark } from '@/components/ui';

interface GuardianSummary {
  learners: Array<{
    learnerId: string;
    displayName: string;
    ageBand: string | null;
    consents: string[];
    openSafetyCases: number;
    pendingReviews: number;
    enrollments: Array<{
      enrollmentId: string;
      program: string;
      paceCode: string;
      status: string;
      masteredCount: number;
      totalCount: number;
      voice: { usedMinutes: number; includedMinutes: number };
    }>;
  }>;
}

const CONSENT_LABELS: Record<string, string> = {
  service: 'Servicio',
  ai_voice: 'Voz con IA',
  storage: 'Almacenamiento',
  international_transfer: 'Transferencia internacional',
  analytics: 'Analítica',
  marketing: 'Marketing',
  research: 'Investigación',
};

const AGE_LABELS: Record<string, string> = {
  y12_13: '12–13 años',
  t14_17: '14–17 años',
  a18_plus: 'Adulto',
};

export default async function FamilyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const summary = await apiFetchOrNull<GuardianSummary>('/guardian/learners');
  if (!summary) redirect(`/${locale}/login`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="rise mb-8">
        <div className="masthead-rule mb-6 w-16" />
        <Wordmark />
        <h1 className="mt-4 font-display text-[1.75rem] font-semibold leading-tight text-ink">
          Portal familiar
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-dim">
          Progreso, carga, permisos y alertas — sin vigilancia secreta: aquí no hay transcripciones
          de las conversaciones de tus hijos, por diseño.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        {summary.learners.map((learner, index) => (
          <Card key={learner.learnerId} accent className={`rise rise-${index + 1} px-5 py-5`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <InitialsAvatar name={learner.displayName} />
                <div>
                  <p className="font-display text-lg font-semibold text-ink">{learner.displayName}</p>
                  <p className="text-xs text-dim">{AGE_LABELS[learner.ageBand ?? ''] ?? '—'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {learner.pendingReviews > 0 && (
                  <Chip tone="primary">{learner.pendingReviews} en revisión académica</Chip>
                )}
                {learner.openSafetyCases > 0 ? (
                  <Chip tone="warn">{learner.openSafetyCases} alerta(s)</Chip>
                ) : (
                  <Chip tone="ok">Sin alertas</Chip>
                )}
              </div>
            </div>

            {learner.enrollments.map((enrollment) => (
              <div key={enrollment.enrollmentId} className="mb-4 rounded-lg border border-line bg-paper px-4 py-4">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-display font-semibold text-ink">{enrollment.program}</span>
                  <Chip tone="primary">{enrollment.paceCode}</Chip>
                </div>
                <Meter
                  label="Competencias dominadas"
                  value={enrollment.totalCount === 0 ? 0 : enrollment.masteredCount / enrollment.totalCount}
                  hint={`${enrollment.masteredCount} de ${enrollment.totalCount}`}
                  tone="gold"
                />
                <div className="mt-4">
                  <Meter
                    label="Voz de la semana"
                    value={
                      enrollment.voice.includedMinutes === 0
                        ? 0
                        : enrollment.voice.usedMinutes / enrollment.voice.includedMinutes
                    }
                    hint={`${enrollment.voice.usedMinutes} / ${enrollment.voice.includedMinutes} min · recibirás avisos al 70, 90 y 100%`}
                    tone="primary"
                  />
                </div>
              </div>
            ))}
            {learner.enrollments.length === 0 && (
              <p className="mb-4 text-sm text-dim">Aún sin inscripciones activas.</p>
            )}

            <SectionTitle className="mb-2">Permisos otorgados</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {learner.consents.map((consent) => (
                <Chip key={consent} tone="ok">
                  {CONSENT_LABELS[consent] ?? consent}
                </Chip>
              ))}
              {learner.consents.length === 0 && <Chip tone="warn">Sin permisos activos</Chip>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
