import { redirect } from 'next/navigation';
import { apiFetchOrNull } from '@/lib/api';
import { Chip, Group, IconTile, InitialsAvatar, Ring, Row, SectionHeader, Wordmark } from '@/components/ui';
import { AcceptInvitationCard, ConsentToggles } from '@/components/family-manager';

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
    <div className="min-h-dvh">
      <header className="material-bar sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5 lg:max-w-5xl">
          <Wordmark />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 lg:max-w-5xl">
        <div className="rise mb-6">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink">Familia</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-dim">
            Progreso, permisos y alertas — sin transcripciones de las conversaciones de tus hijos,
            por diseño.
          </p>
        </div>

        <div className="rise rise-1 mb-7">
          <AcceptInvitationCard />
        </div>

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:items-start">
          {summary.learners.map((learner, index) => (
            <section key={learner.learnerId} className={`rise rise-${index + 1}`}>
              <div className="mb-3 flex items-center gap-3 px-1">
                <InitialsAvatar name={learner.displayName} />
                <div className="flex-1">
                  <p className="text-[18px] font-bold tracking-tight text-ink">{learner.displayName}</p>
                  <p className="text-[13px] text-dim">{AGE_LABELS[learner.ageBand ?? ''] ?? '—'}</p>
                </div>
                {learner.openSafetyCases > 0 ? (
                  <Chip tone="warn">{learner.openSafetyCases} alerta(s)</Chip>
                ) : (
                  <Chip tone="ok">Sin alertas</Chip>
                )}
              </div>

              {learner.enrollments.map((enrollment) => {
                const masteryRatio =
                  enrollment.totalCount === 0 ? 0 : enrollment.masteredCount / enrollment.totalCount;
                const voiceRatio =
                  enrollment.voice.includedMinutes === 0
                    ? 0
                    : enrollment.voice.usedMinutes / enrollment.voice.includedMinutes;
                return (
                  <Group key={enrollment.enrollmentId} className="mb-3">
                    <div className="flex items-center gap-3.5 px-4 py-3">
                      <Ring value={masteryRatio} size={40} strokeWidth={5} color="#5e5ce6" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[16px] text-ink">{enrollment.program}</p>
                        <p className="text-[13px] text-dim">Plan {enrollment.paceCode}</p>
                      </div>
                      <span className="text-[15px] font-semibold tabular-nums text-ink">
                        {enrollment.masteredCount} / {enrollment.totalCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-3.5 px-4 py-3">
                      <IconTile name="mic" color="bg-teal" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between">
                          <p className="text-[16px] text-ink">Voz de la semana</p>
                          <p className="text-[15px] font-semibold tabular-nums text-ink">
                            {enrollment.voice.usedMinutes}
                            <span className="font-normal text-dim"> / {enrollment.voice.includedMinutes} min</span>
                          </p>
                        </div>
                        <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-fill">
                          <div
                            className={`h-full rounded-full ${voiceRatio >= 0.9 ? 'bg-risk' : voiceRatio >= 0.7 ? 'bg-warn' : 'bg-teal'}`}
                            style={{ width: `${Math.min(100, voiceRatio * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[12px] text-dim">Recibirás avisos al 70, 90 y 100%.</p>
                      </div>
                    </div>
                    {learner.pendingReviews > 0 && (
                      <Row
                        icon="shield"
                        iconColor="bg-primary"
                        title="En revisión académica humana"
                        subtitle="Decisiones significativas pendientes de una persona del equipo"
                        trailing={<span className="font-semibold text-ink">{learner.pendingReviews}</span>}
                      />
                    )}
                  </Group>
                );
              })}
              {learner.enrollments.length === 0 && (
                <p className="mb-3 px-1 text-[14px] text-dim">Aún sin inscripciones activas.</p>
              )}

              <SectionHeader className="mt-4">Permisos por finalidad</SectionHeader>
              <ConsentToggles learnerId={learner.learnerId} granted={learner.consents} />
              <p className="mt-2 px-1 text-[12px] leading-relaxed text-dim">
                Revocar &quot;Voz con IA&quot; impide crear nuevas sesiones de voz al instante. Cada
                permiso es independiente (CNS-01).
              </p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
