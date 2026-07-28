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
import { LogoutButton } from '@/components/logout-button';

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

const PACE_LABELS: Record<string, string> = {
  flex: 'Flex',
  accelerated: 'Acelerado',
  sprint: 'Sprint',
};

const STATUS_LABELS: Record<string, string> = {
  pending_diagnostic: 'Diagnóstico pendiente',
  active: 'Activa',
  paused: 'En pausa',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export default async function FamilyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const summary = await apiFetchOrNull<GuardianSummary>('/guardian/learners');
  if (!summary) redirect(`/${locale}/login`);

  const learnerCount = summary.learners.length;

  return (
    <div className="mission-shell min-h-dvh">
      <header className="material-bar sticky top-0 z-40 border-b border-line/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-2.5">
            <span className="hidden rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary sm:inline">
              Control familiar
            </span>
            <LogoutButton locale={locale} />
          </div>
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
              {learnerCount === 1
                ? '1 estudiante vinculado'
                : `${learnerCount} estudiantes vinculados`}
            </span>
          }
        />

        {/* Sin estudiantes: crear la cuenta ES el contenido principal. */}
        {learnerCount === 0 && (
          <>
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
              <NovaGuide state="idle" eyebrow="Nova · acompañamiento responsable" className="rise rise-1">
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
          </>
        )}

        {/* Con estudiantes: SU información va primero (decisión 2026-07-28). */}
        <div className="mt-7 grid gap-8 lg:grid-cols-2 lg:items-start">
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
                          Plan {PACE_LABELS[enrollment.paceCode] ?? enrollment.paceCode} ·{' '}
                          {STATUS_LABELS[enrollment.status] ?? enrollment.status}
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

        {/* Con estudiantes, las acciones secundarias van al final, compactas. */}
        {learnerCount > 0 && (
          <>
            <p className="mb-2 mt-10 px-1 text-[10px] font-extrabold uppercase tracking-[0.13em] text-dim">
              Más opciones
            </p>
            <AuroraSurface className="max-w-2xl overflow-hidden" tone="neutral">
              <Link
                href={`/${locale}/family/add-child`}
                className="flex items-center gap-3.5 px-4 py-4 transition hover:bg-mist/40 sm:px-5"
              >
                <IconTile name="route" color="bg-gold" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-ink">
                    Crear otra cuenta de estudiante
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-dim">
                    Usuario y contraseña temporal, sin pedir el correo del menor.
                  </span>
                </span>
                <Icon name="chevron" className="size-4 shrink-0 text-dim" />
              </Link>
              <details className="border-t border-line">
                <summary className="flex cursor-pointer items-center gap-3.5 px-4 py-4 transition hover:bg-mist/40 sm:px-5">
                  <IconTile name="lock" color="bg-fill" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-ink">
                      Usar un código de invitación anterior
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-dim">
                      Solo para estudiantes que empezaron con el recorrido antiguo.
                    </span>
                  </span>
                  <Icon name="chevron" className="size-4 shrink-0 text-dim" />
                </summary>
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  <AcceptInvitationCard />
                </div>
              </details>
            </AuroraSurface>
          </>
        )}
      </main>
    </div>
  );
}
