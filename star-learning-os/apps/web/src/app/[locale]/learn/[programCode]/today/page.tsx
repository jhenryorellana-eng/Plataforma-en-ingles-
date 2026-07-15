import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { TodayResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Card, Chip, Icon, SectionTitle } from '@/components/ui';
import { StartLessonButton } from '@/components/start-lesson-button';

const BLOCK_ICONS = { review: 'review', lesson: 'today', voice_mission: 'mic' } as const;

export default async function TodayPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  const enrollment = await resolveEnrollment(programCode);
  if (!enrollment) redirect(`/${locale}/login`);
  if (enrollment.status === 'pending_diagnostic') redirect(`/${locale}/learn/${programCode}/diagnostic`);

  const today = await apiFetch<TodayResponse>(`/enrollments/${enrollment.id}/today`);
  const voiceRatio =
    today.voice.includedMinutes === 0 ? 1 : today.voice.usedMinutes / today.voice.includedMinutes;
  const primaryBlock = today.blocks.find((block) => block.kind === 'lesson') ?? today.blocks[0];

  return (
    <div className="flex flex-col gap-7">
      <section className="rise">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim">Plan de hoy</p>
        <h1 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight text-ink">
          {today.trajectoryStatus === 'on_track' ? 'Vas en ruta.' : 'Recuperemos el ritmo.'}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-dim">{today.nextMilestone}</p>
      </section>

      {primaryBlock && primaryBlock.lessonContractId && (
        <div className="rise rise-1">
          <StartLessonButton
            locale={locale}
            programCode={programCode}
            enrollmentId={enrollment.id}
            lessonContractId={primaryBlock.lessonContractId}
            label="Continuar mi sesión"
            sublabel={`${primaryBlock.title} · ${primaryBlock.estimatedMinutes} min`}
          />
        </div>
      )}

      <section className="rise rise-2 flex flex-col gap-3">
        <SectionTitle>Bloques de hoy · máximo 3</SectionTitle>
        {today.blocks.map((block) => (
          <Card key={block.kind + block.title} className="flex items-center gap-4 px-4 py-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon name={BLOCK_ICONS[block.kind]} className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{block.title}</p>
              <p className="text-xs leading-relaxed text-dim">{block.description}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Chip>{block.estimatedMinutes} min</Chip>
              {block.kind === 'review' && (
                <Link
                  href={`/${locale}/learn/${programCode}/review`}
                  className="text-xs font-medium text-primary underline underline-offset-2"
                >
                  Ir a repasar
                </Link>
              )}
              {block.kind === 'voice_mission' && (
                <Link
                  href={`/${locale}/learn/${programCode}/voice`}
                  className="text-xs font-medium text-primary underline underline-offset-2"
                >
                  Ir a hablar
                </Link>
              )}
            </div>
          </Card>
        ))}
        {today.blocks.length === 0 && (
          <Card className="px-4 py-6 text-center text-sm text-dim">
            Estás al día. Puedes practicar algo opcional o descansar: la constancia vale más que la
            maratón.
          </Card>
        )}
      </section>

      <section className="rise rise-3">
        <SectionTitle className="mb-3">Tu semana</SectionTitle>
        <Card className="divide-y divide-line">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-dim">Meta semanal</span>
            <span className="font-display font-semibold text-ink">{today.weeklyGoalHours} h de práctica</span>
          </div>
          <div className="px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="text-dim">Voz con tu Mentor</span>
              <span className="font-mono font-medium tabular-nums text-ink">
                {today.voice.usedMinutes} / {today.voice.includedMinutes} min
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-mist">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${
                  voiceRatio >= 0.9 ? 'bg-risk' : voiceRatio >= 0.7 ? 'bg-warn' : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, voiceRatio * 100)}%` }}
              />
            </div>
            {today.voice.alertLevel !== null && (
              <p className="mt-1.5 text-xs text-warn">
                Has usado el {Math.round(today.voice.alertLevel * 100)}% de tus minutos. Tu apoderado
                también recibe este aviso.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-dim">Repasos pendientes</span>
            <span className="font-mono font-medium tabular-nums text-ink">{today.dueReviews}</span>
          </div>
        </Card>
      </section>
    </div>
  );
}
