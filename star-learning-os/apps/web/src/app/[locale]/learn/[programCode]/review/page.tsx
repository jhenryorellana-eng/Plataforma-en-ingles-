import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReviewQueueResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Icon, type IconName } from '@/components/ui';
import { StartLessonButton } from '@/components/start-lesson-button';
import { AuroraHero, AuroraSurface } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';

const REVIEW_LENSES: Array<{
  title: string;
  description: string;
  icon: IconName;
  tone: string;
  surfaceTone: 'blue' | 'cyan' | 'gold';
}> = [
  {
    title: 'Gramática',
    description: 'Patrones que necesitan otra oportunidad.',
    icon: 'pencil',
    tone: 'bg-primary-soft text-primary-deep',
    surfaceTone: 'blue',
  },
  {
    title: 'Forma natural',
    description: 'Cómo sonar más claro y menos traducido.',
    icon: 'review',
    tone: 'bg-teal/15 text-teal',
    surfaceTone: 'cyan',
  },
  {
    title: 'Pronunciación',
    description: 'Sonidos recuperados desde tus misiones de voz.',
    icon: 'mic',
    tone: 'bg-gold-soft text-gold-deep',
    surfaceTone: 'gold',
  },
];

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  const resolution = await resolveEnrollment(programCode);
  if (resolution.kind === 'anonymous') redirect(`/${locale}/login`);
  if (resolution.kind === 'no-enrollment') redirect(`/${locale}/enroll`);
  const enrollment = resolution.enrollment;
  if (enrollment.status === 'pending_diagnostic') {
    redirect(`/${locale}/learn/${programCode}/diagnostic`);
  }

  const queue = await apiFetch<ReviewQueueResponse>(`/enrollments/${enrollment.id}/review-queue`);
  const estimatedMinutes = queue.dueItems.length * 3;
  const empty = queue.dueItems.length === 0;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <AuroraHero
        asset="starmap"
        eyebrow="Memoria activa"
        title="Observatorio de memoria"
        body={
          empty
            ? 'Tu órbita está despejada. Aquí reaparecerán tus errores justo cuando repasarlos produzca más aprendizaje.'
            : `Hay ${queue.dueItems.length} señales listas para recuperar hoy. En unos ${estimatedMinutes} minutos puedes volver a ponerlas en órbita.`
        }
        badge={
          <span className="rounded-full border border-white/20 bg-[#071525]/75 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#ffd35a] backdrop-blur">
            {empty ? 'Memoria al día' : `${queue.dueItems.length} por recuperar`}
          </span>
        }
        tone="gold"
        compact
        priority
      />

      <NovaGuide compact state={empty ? 'celebrate' : 'thinking'}>
        {empty
          ? 'Buen trabajo. Hoy puedes avanzar en tu ruta o practicar una conversación conmigo.'
          : 'Empezaremos por lo que está a punto de olvidarse; recuperar a tiempo fortalece la memoria.'}
      </NovaGuide>

      <section className="mission-panel rise rise-1 overflow-hidden rounded-[28px]">
        <div className="flex items-center gap-4 border-b border-line px-5 py-5 sm:px-6">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-[20px] bg-gold-soft text-gold-deep shadow-[0_4px_0_color-mix(in_srgb,var(--color-fill)_68%,#06111f)]">
            <Icon name="review" className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="mission-kicker text-[9px] text-dim">Repaso de hoy</p>
            <p className="mt-1 text-[22px] font-extrabold leading-none text-ink">
              {queue.dueItems.length} {queue.dueItems.length === 1 ? 'elemento' : 'elementos'}
            </p>
            <p className="mt-1 text-[12px] text-dim">
              {estimatedMinutes > 0
                ? `~${estimatedMinutes} min para recuperar lo importante`
                : 'Sin práctica pendiente por ahora'}
            </p>
          </div>
        </div>

        {empty ? (
          <div className="flex flex-col items-center px-5 py-8 text-center sm:px-8">
            <span className="flex size-16 items-center justify-center rounded-[22px] border border-ok/25 bg-ok-soft text-ok-deep shadow-[0_5px_0_color-mix(in_srgb,var(--color-fill)_70%,#06111f)]">
              <Icon name="check" className="size-7" />
            </span>
            <h2 className="mt-5 text-[21px] font-extrabold tracking-[-0.03em] text-ink">
              Tu memoria está al día
            </h2>
            <p className="mt-2 max-w-[44ch] text-[13px] leading-relaxed text-dim">
              No tienes repasos vencidos. La siguiente misión mantiene vivo lo que ya dominaste.
            </p>
            <Link
              href={`/${locale}/learn/${programCode}/today`}
              className="tactile-button mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl px-6 text-[14px] font-extrabold text-white"
            >
              Volver a Hoy
              <Icon name="arrow" className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-line">
            {queue.dueItems.map((item, index) => (
              <div key={item.reviewItemId} className="flex items-center gap-3.5 px-4 py-4 sm:px-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-[13px] font-extrabold text-gold-deep">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold leading-snug text-ink">
                    {item.competencyDescriptor}
                  </p>
                  <p className="mt-1 text-[11px] text-dim">
                    Vuelve hoy · intervalo {item.intervalDays} días
                  </p>
                </div>
                {item.lessonContractId ? (
                  <StartLessonButton
                    locale={locale}
                    programCode={programCode}
                    enrollmentId={enrollment.id}
                    lessonContractId={item.lessonContractId}
                    label="Practicar"
                    reviewItemId={item.reviewItemId}
                    focusActivityId={item.activityId ?? undefined}
                    compact
                  />
                ) : (
                  <Link
                    href={`/${locale}/learn/${programCode}/path`}
                    className="flex min-h-11 shrink-0 items-center rounded-xl px-3 text-[13px] font-bold text-primary-deep hover:bg-primary-soft"
                  >
                    Ver ruta
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rise rise-2">
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="mission-kicker text-[9px] text-dim">Cómo funciona</p>
            <h2 className="mt-1 text-[19px] font-extrabold text-ink">Tres formas de recuperar</h2>
          </div>
          <span className="hidden text-[11px] text-dim sm:block">Se activan según tu práctica</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {REVIEW_LENSES.map((lens) => (
            <AuroraSurface key={lens.title} tone={lens.surfaceTone} className="p-4">
              <span className={`flex size-10 items-center justify-center rounded-[14px] ${lens.tone}`}>
                <Icon name={lens.icon} className="size-4.5" />
              </span>
              <h3 className="mt-4 text-[15px] font-extrabold text-ink">{lens.title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-dim">{lens.description}</p>
            </AuroraSurface>
          ))}
        </div>
      </section>
    </div>
  );
}
