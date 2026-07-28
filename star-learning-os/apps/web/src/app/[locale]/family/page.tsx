import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { apiFetchOrNull } from '@/lib/api';
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

/** Tarjeta blanca del sistema de la consola (sombra suave sin override oscuro). */
const CARD =
  'overflow-hidden rounded-3xl bg-surface shadow-[0_1px_2px_rgba(16,33,54,0.05),0_10px_30px_-12px_rgba(16,33,54,0.14)]';

export default async function FamilyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [summary, me] = await Promise.all([
    apiFetchOrNull<GuardianSummary>('/guardian/learners'),
    apiFetchOrNull<MeResponse>('/auth/me'),
  ]);
  if (!summary) redirect(`/${locale}/login`);

  const firstName = me?.displayName.trim().split(/\s+/)[0] ?? '';
  const learnerCount = summary.learners.length;

  return (
    <div className="force-light min-h-dvh bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-2.5">
            <span className="hidden rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary sm:inline">
              Control familiar
            </span>
            <LogoutButton locale={locale} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-7 sm:px-6 sm:pt-9">
        <h1 className="text-[clamp(1.8rem,5vw,2.4rem)] font-extrabold leading-tight tracking-[-0.03em]">
          {firstName ? `Hola, ${firstName}` : 'Hola'}
        </h1>
        <p className="mt-1.5 max-w-[58ch] text-[13.5px] leading-relaxed text-dim">
          {learnerCount === 0
            ? 'Crea el acceso de tu hijo o hija para empezar a acompañar su avance.'
            : `${learnerCount === 1 ? '1 estudiante a tu cargo' : `${learnerCount} estudiantes a tu cargo`} · progreso, permisos y alertas, sin invadir su espacio. Nunca mostramos transcripciones de sus conversaciones.`}
        </p>

        {learnerCount === 0 && (
          <div className={`${CARD} mt-7 px-5 py-10 text-center`}>
            <span className="mx-auto flex size-14 items-center justify-center rounded-[20px_20px_20px_7px] bg-primary-soft">
              <Icon name="route" className="size-6 text-primary" />
            </span>
            <h2 className="mt-5 text-[21px] font-extrabold tracking-tight">
              Tu red familiar aún está vacía
            </h2>
            <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-dim">
              Tú defines su usuario y una contraseña temporal — sin pedirle un correo. Después,
              el estudiante crea su contraseña privada y decide su propio asentimiento.
            </p>
            <Link
              href={`/${locale}/family/add-child`}
              className="tactile-button mx-auto mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-[14px] font-extrabold text-white"
            >
              Crear cuenta del estudiante <Icon name="arrow" className="size-4" />
            </Link>
          </div>
        )}

        <div className={`mt-7 grid gap-x-8 gap-y-9 ${learnerCount > 1 ? 'lg:grid-cols-2' : ''}`}>
          {summary.learners.map((learner) => (
            <section
              key={learner.learnerId}
              className="min-w-0"
              aria-labelledby={`learner-${learner.learnerId}`}
            >
              <div className="mb-3.5 flex items-center gap-3 px-1">
                <InitialsAvatar name={learner.displayName} className="size-11" />
                <div className="min-w-0 flex-1">
                  <h2
                    id={`learner-${learner.learnerId}`}
                    className="truncate text-[19px] font-extrabold tracking-tight"
                  >
                    {learner.displayName}
                  </h2>
                  <p className="text-[12px] text-dim">
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
                  <div key={enrollment.enrollmentId} className={`${CARD} mb-4`}>
                    <div className="flex items-center gap-3.5 px-4 py-4 sm:px-5">
                      <span aria-hidden>
                        <Ring
                          value={masteryRatio}
                          size={46}
                          strokeWidth={6}
                          color="#596cff"
                          colorTo="#0ebfc4"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15.5px] font-extrabold">
                          {enrollment.program}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-dim">
                          Plan {PACE_LABELS[enrollment.paceCode] ?? enrollment.paceCode} ·{' '}
                          {STATUS_LABELS[enrollment.status] ?? enrollment.status}
                        </p>
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="block text-[15px] font-extrabold tabular-nums">
                          {enrollment.masteredCount}/{enrollment.totalCount}
                        </span>
                        <span className="block text-[9px] font-bold uppercase tracking-wide text-dim">
                          dominios
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start gap-3.5 border-t border-line px-4 py-4 sm:px-5">
                      <IconTile name="mic" color="bg-teal" className="mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5 min-[390px]:flex-row min-[390px]:items-baseline min-[390px]:justify-between">
                          <p className="text-[13.5px] font-bold">Voz de la semana</p>
                          <p className="text-[12px] font-extrabold tabular-nums">
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
                      <div className="flex items-center gap-3 border-t border-line bg-primary-soft/50 px-4 py-3.5 sm:px-5">
                        <IconTile name="shield" color="bg-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold">Revisión académica humana</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-dim">
                            Decisiones significativas esperando a una persona del equipo.
                          </p>
                        </div>
                        <Chip tone="primary">{learner.pendingReviews}</Chip>
                      </div>
                    )}
                  </div>
                );
              })}
              {learner.enrollments.length === 0 && (
                <div className={`${CARD} mb-4 flex items-center gap-3 px-4 py-4`}>
                  <IconTile name="route" color="bg-fill" />
                  <div>
                    <p className="text-[13px] font-bold">Aún sin inscripciones activas</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-dim">
                      El progreso aparecerá aquí cuando inicie una ruta.
                    </p>
                  </div>
                </div>
              )}

              <p className="mb-2 mt-5 px-1 text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-dim">
                Permisos por finalidad
              </p>
              <ConsentToggles learnerId={learner.learnerId} granted={learner.consents} />
              <p className="mt-2.5 px-1 text-[10.5px] leading-relaxed text-dim">
                Revocar &quot;Voz con IA&quot; impide nuevas sesiones de voz al instante. La voz
                solo funciona mientras el procesamiento internacional esté autorizado.
              </p>
            </section>
          ))}
        </div>

        {learnerCount > 0 && (
          <>
            <p className="mb-2 mt-10 px-1 text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-dim">
              Más opciones
            </p>
            <div className={`${CARD} max-w-2xl`}>
              <Link
                href={`/${locale}/family/add-child`}
                className="flex items-center gap-3.5 px-4 py-4 transition hover:bg-mist/50 sm:px-5"
              >
                <IconTile name="route" color="bg-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold">
                    Crear otra cuenta de estudiante
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-dim">
                    Usuario y contraseña temporal, sin pedir el correo del menor.
                  </span>
                </span>
                <Icon name="chevron" className="size-4 shrink-0 text-dim" />
              </Link>
              <details className="border-t border-line">
                <summary className="flex cursor-pointer items-center gap-3.5 px-4 py-4 transition hover:bg-mist/50 sm:px-5">
                  <IconTile name="lock" color="bg-fill" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold">
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
            </div>
          </>
        )}
      </main>
    </div>
  );
}
