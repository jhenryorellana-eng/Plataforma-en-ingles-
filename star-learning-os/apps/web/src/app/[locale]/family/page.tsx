import Link from 'next/link';
import { redirect } from 'next/navigation';
import { apiFetchOrNull } from '@/lib/api';
import { AuroraHero, AuroraSurface } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';
import { Chip, Icon, IconTile, InitialsAvatar, Ring, Wordmark } from '@/components/ui';
import {
  AcceptInvitationCard,
  ConsentToggles,
  ManagedLearnerAccess,
} from '@/components/family-manager';

interface GuardianSummary {
  learners: Array<{
    learnerId: string;
    displayName: string;
    loginName: string | null;
    ageBand: string | null;
    mustChangePassword: boolean;
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
    <div className="mission-shell min-h-dvh">
      <header className="material-bar sticky top-0 z-40 border-b border-line/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Wordmark />
          <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">
            Control familiar
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3.5 pb-16 pt-4 sm:px-6 sm:pt-7">
        <AuroraHero
          asset="family"
          eyebrow="Centro de acompañamiento"
          title="Acompaña su avance sin invadir su espacio."
          body="Aquí ves progreso, permisos y alertas necesarias. Nunca mostramos transcripciones de sus conversaciones: esa privacidad es parte del diseño."
          tone="gold"
          priority
          imageAlt="Apoderado acompañando la ruta educativa desde un centro de misión"
          compact
          badge={
            <span className="rounded-full border border-white/20 bg-[#071525]/70 px-3 py-1.5 text-[10px] font-bold text-white/85 backdrop-blur-md">
              {summary.learners.length === 1
                ? '1 estudiante vinculado'
                : `${summary.learners.length} estudiantes vinculados`}
            </span>
          }
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <AuroraSurface className="rise overflow-hidden" tone="gold">
            <div className="p-5 sm:p-6">
              <IconTile name="route" color="bg-gold" />
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gold-deep">
                Siguiente paso
              </p>
              <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">
                Crea la cuenta de tu hijo o hija
              </h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-dim">
                Tú defines su usuario y una contraseña temporal. No pediremos su correo y el
                estudiante elegirá después su contraseña privada y su propio asentimiento.
              </p>
              <Link
                href={`/${locale}/family/add-child`}
                className="tactile-button mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-center text-[14px] font-extrabold text-white"
              >
                Crear cuenta del estudiante <Icon name="arrow" className="size-4" />
              </Link>
            </div>
          </AuroraSurface>
          <NovaGuide
            state="idle"
            eyebrow="Nova · acompañamiento responsable"
            className="rise rise-1"
          >
            El progreso ayuda a conversar y acompañar. Las prácticas y conversaciones siguen
            perteneciendo al espacio del estudiante.
          </NovaGuide>
        </div>

        <details className="rise rise-2 mt-5 max-w-xl rounded-2xl border border-line bg-surface px-4 py-3.5">
          <summary className="cursor-pointer text-[12.5px] font-bold text-primary">
            Usar un código de invitación anterior
          </summary>
          <p className="mb-3 mt-2 text-[11px] leading-relaxed text-dim">
            Esta opción se mantiene para estudiantes que iniciaron el proceso con el recorrido
            anterior.
          </p>
          <AcceptInvitationCard />
        </details>

        {summary.learners.length === 0 && (
          <AuroraSurface className="rise rise-2 mt-7 px-5 py-10 text-center" tone="neutral">
            <span className="mx-auto flex size-14 items-center justify-center rounded-[20px_20px_20px_7px] border border-primary/20 bg-primary-soft">
              <Icon name="route" className="size-6 text-primary" />
            </span>
            <h2 className="mt-5 text-[22px] font-extrabold tracking-tight text-ink">
              Tu red familiar aún está vacía
            </h2>
            <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-dim">
              Crea la cuenta del estudiante para entregarle sus accesos. Aquí aparecerán después su
              progreso, permisos y las señales necesarias para acompañar.
            </p>
            <Link
              href={`/${locale}/family/add-child`}
              className="tactile-button mx-auto mt-5 inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-[14px] font-extrabold text-white"
            >
              Crear su cuenta
            </Link>
          </AuroraSurface>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
          {summary.learners.map((learner, index) => (
            <section
              key={learner.learnerId}
              className={`rise rise-${Math.min(index + 1, 3)} min-w-0`}
              aria-labelledby={`learner-${learner.learnerId}`}
            >
              <div className="mb-4 flex items-start gap-3 px-1">
                <InitialsAvatar name={learner.displayName} className="size-12" />
                <div className="min-w-0 flex-1">
                  <h2
                    id={`learner-${learner.learnerId}`}
                    className="truncate text-[20px] font-extrabold tracking-tight text-ink"
                  >
                    {learner.displayName}
                  </h2>
                  <p className="mt-0.5 text-[12px] text-dim">
                    {AGE_LABELS[learner.ageBand ?? ''] ?? 'Edad no disponible'}
                  </p>
                </div>
                {learner.openSafetyCases > 0 ? (
                  <Chip tone="warn">{learner.openSafetyCases} alerta(s)</Chip>
                ) : (
                  <Chip tone="ok">Sin alertas</Chip>
                )}
              </div>

              {learner.loginName && (
                <ManagedLearnerAccess
                  learnerId={learner.learnerId}
                  displayName={learner.displayName}
                  loginName={learner.loginName}
                  mustChangePassword={learner.mustChangePassword}
                />
              )}

              {learner.enrollments.map((enrollment) => {
                const masteryRatio =
                  enrollment.totalCount === 0
                    ? 0
                    : enrollment.masteredCount / enrollment.totalCount;
                const voiceRatio =
                  enrollment.voice.includedMinutes === 0
                    ? 0
                    : enrollment.voice.usedMinutes / enrollment.voice.includedMinutes;
                return (
                  <AuroraSurface
                    key={enrollment.enrollmentId}
                    className="mb-4 overflow-hidden"
                    tone="blue"
                  >
                    <div className="flex items-center gap-3.5 border-b border-line px-4 py-4 sm:px-5">
                      <span aria-hidden>
                        <Ring
                          value={masteryRatio}
                          size={48}
                          strokeWidth={6}
                          color="#8292ff"
                          colorTo="#4ce4f4"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-extrabold text-ink">
                          {enrollment.program}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-dim">
                          Plan {enrollment.paceCode} · {enrollment.status}
                        </p>
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="block text-[15px] font-extrabold tabular-nums text-ink">
                          {enrollment.masteredCount}/{enrollment.totalCount}
                        </span>
                        <span className="block text-[9px] font-bold uppercase tracking-wide text-dim">
                          dominios
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start gap-3.5 px-4 py-4 sm:px-5">
                      <IconTile name="mic" color="bg-teal" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5 min-[390px]:flex-row min-[390px]:items-baseline min-[390px]:justify-between">
                          <p className="text-[14px] font-bold text-ink">Voz de la semana</p>
                          <p className="text-[12px] font-extrabold tabular-nums text-ink">
                            {enrollment.voice.usedMinutes}
                            <span className="font-medium text-dim">
                              {' '}
                              / {enrollment.voice.includedMinutes} min
                            </span>
                          </p>
                        </div>
                        <div
                          className="mt-2 h-2 overflow-hidden rounded-full bg-fill"
                          role="progressbar"
                          aria-label="Minutos de voz utilizados esta semana"
                          aria-valuemin={0}
                          aria-valuemax={enrollment.voice.includedMinutes}
                          aria-valuenow={enrollment.voice.usedMinutes}
                        >
                          <div
                            className={`h-full rounded-full ${voiceRatio >= 0.9 ? 'bg-risk' : voiceRatio >= 0.7 ? 'bg-warn' : 'bg-teal'}`}
                            style={{ width: `${Math.min(100, voiceRatio * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10.5px] leading-relaxed text-dim">
                          Recibirás avisos al 70, 90 y 100%.
                        </p>
                      </div>
                    </div>
                    {learner.pendingReviews > 0 && (
                      <div className="flex items-start gap-3 border-t border-line bg-primary-soft/40 px-4 py-3.5 sm:px-5">
                        <IconTile name="shield" color="bg-primary" className="mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-ink">
                            Revisión académica humana
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-dim">
                            Hay decisiones significativas pendientes de una persona del equipo.
                          </p>
                        </div>
                        <Chip tone="primary">{learner.pendingReviews}</Chip>
                      </div>
                    )}
                  </AuroraSurface>
                );
              })}
              {learner.enrollments.length === 0 && (
                <AuroraSurface className="mb-4 flex items-center gap-3 px-4 py-4" tone="neutral">
                  <IconTile name="route" color="bg-fill" />
                  <div>
                    <p className="text-[13px] font-bold text-ink">Aún sin inscripciones activas</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-dim">
                      El progreso aparecerá aquí cuando inicie una ruta.
                    </p>
                  </div>
                </AuroraSurface>
              )}

              <div className="mb-3 mt-5 px-1">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-teal">
                  Privacidad y funciones
                </p>
                <h3 className="mt-1 text-[17px] font-extrabold tracking-tight text-ink">
                  Permisos por finalidad
                </h3>
              </div>
              <ConsentToggles learnerId={learner.learnerId} granted={learner.consents} />
              <p className="mt-3 px-1 text-[11px] leading-relaxed text-dim">
                Revocar &quot;Voz con IA&quot; impide crear nuevas sesiones de voz al instante. Cada
                permiso se muestra por separado; la voz solo funciona mientras el procesamiento
                internacional esté autorizado.
              </p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
