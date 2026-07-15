import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { MeResponse, TodayResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Group, Icon, Row, SectionHeader } from '@/components/ui';
import { StartLessonButton } from '@/components/start-lesson-button';

export default async function TodayPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  const enrollment = await resolveEnrollment(programCode);
  if (!enrollment) redirect(`/${locale}/login`);
  if (enrollment.status === 'pending_diagnostic') redirect(`/${locale}/learn/${programCode}/diagnostic`);
  // Metodología §7.5: el ritmo se confirma tras el diagnóstico, antes del plan diario.
  if (!enrollment.paceConfirmed) redirect(`/${locale}/learn/${programCode}/pace`);

  const [me, today] = await Promise.all([
    apiFetch<MeResponse>('/auth/me'),
    apiFetch<TodayResponse>(`/enrollments/${enrollment.id}/today`),
  ]);

  const firstName = me.displayName.split(' ')[0];
  const dateLabel = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const voiceRatio =
    today.voice.includedMinutes === 0 ? 1 : today.voice.usedMinutes / today.voice.includedMinutes;
  const primaryBlock = today.blocks.find((block) => block.kind === 'lesson') ?? today.blocks[0];
  const voiceBlock = today.blocks.find((block) => block.kind === 'voice_mission');
  const reviewBlock = today.blocks.find((block) => block.kind === 'review');

  return (
    <div className="flex flex-col gap-7">
      <header className="rise">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">{dateLabel}</p>
        <h1 className="mt-0.5 text-[34px] font-extrabold leading-tight tracking-tight text-ink">
          Hola, {firstName}
        </h1>
      </header>

      {primaryBlock && primaryBlock.lessonContractId && (
        <div className="rise rise-1">
          <StartLessonButton
            locale={locale}
            programCode={programCode}
            enrollmentId={enrollment.id}
            lessonContractId={primaryBlock.lessonContractId}
            label={primaryBlock.title}
            sublabel={`${primaryBlock.description} · ${primaryBlock.estimatedMinutes} min`}
          />
        </div>
      )}

      <section className="rise rise-2">
        <SectionHeader>Tu día</SectionHeader>
        <Group>
          {voiceBlock && (
            <Link href={`/${locale}/learn/${programCode}/voice`} className="block transition-colors hover:bg-mist/60">
              <Row
                icon="mic"
                iconColor="bg-teal"
                title={voiceBlock.title}
                subtitle={voiceBlock.description}
                trailing={`${voiceBlock.estimatedMinutes} min`}
                chevron
              />
            </Link>
          )}
          {reviewBlock && (
            <Link href={`/${locale}/learn/${programCode}/review`} className="block transition-colors hover:bg-mist/60">
              <Row
                icon="review"
                iconColor="bg-gold"
                title="Repasos pendientes"
                subtitle={reviewBlock.description}
                trailing={`${reviewBlock.dueCount ?? ''}`}
                chevron
              />
            </Link>
          )}
          <Link href={`/${locale}/learn/${programCode}/path`} className="block transition-colors hover:bg-mist/60">
            <Row
              icon="route"
              iconColor="bg-blue"
              title="Tu siguiente hito"
              subtitle={today.nextMilestone}
              chevron
            />
          </Link>
        </Group>
        {today.blocks.length === 0 && (
          <p className="mt-3 px-5 text-[13px] text-dim">
            Estás al día. La constancia vale más que la maratón.
          </p>
        )}
      </section>

      <section className="rise rise-3">
        <SectionHeader>Esta semana</SectionHeader>
        <Group>
          <Row
            icon="today"
            iconColor="bg-primary"
            title="Meta semanal"
            trailing={<span className="font-semibold text-ink">{today.weeklyGoalHours} h</span>}
          />
          <div className="px-4 py-3">
            <div className="flex items-center gap-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-teal">
                <Icon name="mic" className="size-4.5 text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="text-[16px] text-ink">Voz con tu Mentor</p>
                  <p className="text-[15px] font-semibold tabular-nums text-ink">
                    {today.voice.usedMinutes}
                    <span className="font-normal text-dim"> / {today.voice.includedMinutes} min</span>
                  </p>
                </div>
                <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-fill">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ${
                      voiceRatio >= 0.9 ? 'bg-risk' : voiceRatio >= 0.7 ? 'bg-warn' : 'bg-teal'
                    }`}
                    style={{ width: `${Math.min(100, voiceRatio * 100)}%` }}
                  />
                </div>
                {today.voice.alertLevel !== null && (
                  <p className="mt-1.5 text-[12px] text-gold-deep">
                    Aviso del {Math.round(today.voice.alertLevel * 100)}% enviado también a tu apoderado.
                  </p>
                )}
              </div>
            </div>
          </div>
          <Row
            icon="check"
            iconColor="bg-ok"
            title="Estado de trayectoria"
            trailing={
              <span className={`font-semibold ${today.trajectoryStatus === 'on_track' ? 'text-ok-deep' : 'text-gold-deep'}`}>
                {today.trajectoryStatus === 'on_track' ? 'En ruta' : 'En riesgo'}
              </span>
            }
          />
        </Group>
      </section>
    </div>
  );
}
