import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { MeResponse, TodayResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Group, IconTile, Ring, Row, SectionHeader } from '@/components/ui';
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
  const totalMinutes = today.blocks.reduce((sum, block) => sum + block.estimatedMinutes, 0);

  return (
    <div className="flex flex-col gap-7">
      <header className="rise">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">{dateLabel}</p>
        <h1 className="mt-0.5 text-[36px] font-extrabold leading-tight tracking-tight text-ink">
          Hola, <span className="text-gradient">{firstName}</span>
        </h1>
        {today.blocks.length > 0 && (
          <p className="mt-1 text-[15px] text-dim">
            {today.blocks.length} {today.blocks.length === 1 ? 'actividad' : 'actividades'} · ~
            {totalMinutes} min para hoy
          </p>
        )}
      </header>

      <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[1.55fr_1fr] lg:items-start lg:gap-9">
        <div className="flex flex-col gap-7">
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
            <SectionHeader>Misiones de hoy</SectionHeader>
            <Group>
              {voiceBlock && (
                <Link
                  href={`/${locale}/learn/${programCode}/voice`}
                  className="block transition-colors hover:bg-mist/60"
                >
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
                <Link
                  href={`/${locale}/learn/${programCode}/review`}
                  className="block transition-colors hover:bg-mist/60"
                >
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
              <Link
                href={`/${locale}/learn/${programCode}/path`}
                className="block transition-colors hover:bg-mist/60"
              >
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
        </div>

        <section className="rise rise-3">
          <SectionHeader>Esta semana</SectionHeader>
          <Group>
            <div className="flex items-center gap-4 px-4 py-4">
              <Ring
                value={voiceRatio}
                size={72}
                strokeWidth={8}
                color={voiceRatio >= 0.9 ? '#ff453a' : '#17b8cd'}
                colorTo={voiceRatio >= 0.9 ? undefined : '#5e5ce6'}
              >
                <span className="text-[15px] font-extrabold tabular-nums text-ink">
                  {Math.round(voiceRatio * 100)}%
                </span>
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-ink">Voz con tu Mentor</p>
                <p className="text-[14px] tabular-nums text-dim">
                  {today.voice.usedMinutes} de {today.voice.includedMinutes} min
                </p>
                {today.voice.alertLevel !== null && (
                  <p className="mt-1 text-[12px] text-gold-deep">
                    Aviso del {Math.round(today.voice.alertLevel * 100)}% enviado también a tu
                    apoderado.
                  </p>
                )}
              </div>
              <IconTile name="mic" color="bg-teal" />
            </div>
            <Row
              icon="today"
              iconColor="bg-primary"
              title="Meta semanal"
              trailing={<span className="font-semibold text-ink">{today.weeklyGoalHours} h</span>}
            />
            <Row
              icon="check"
              iconColor="bg-ok"
              title="Estado de trayectoria"
              trailing={
                <span
                  className={`font-semibold ${today.trajectoryStatus === 'on_track' ? 'text-ok-deep' : 'text-gold-deep'}`}
                >
                  {today.trajectoryStatus === 'on_track' ? 'En ruta' : 'En riesgo'}
                </span>
              }
            />
          </Group>
        </section>
      </div>
    </div>
  );
}
