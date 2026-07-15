import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { TodayResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Card, Chip, SectionTitle } from '@/components/ui';
import { StartLessonButton } from '@/components/start-lesson-button';

const BLOCK_ICONS: Record<string, string> = { review: '↻', lesson: '✦', voice_mission: '◉' };

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
    <div className="flex flex-col gap-6">
      <section className="rise">
        <p className="text-sm text-dim">Hoy en tu ruta</p>
        <h1 className="font-display text-2xl font-semibold leading-snug">
          {today.trajectoryStatus === 'on_track' ? 'Vas en ruta' : 'Recuperemos el ritmo'}
          <span className="text-star"> ✦</span>
        </h1>
        <p className="mt-1 text-sm text-dim">{today.nextMilestone}</p>
      </section>

      {primaryBlock && primaryBlock.lessonContractId && (
        <div className="rise rise-1">
          <StartLessonButton
            locale={locale}
            programCode={programCode}
            enrollmentId={enrollment.id}
            lessonContractId={primaryBlock.lessonContractId}
            label="Continuar mi misión"
            sublabel={`${primaryBlock.title} · ${primaryBlock.estimatedMinutes} min`}
          />
        </div>
      )}

      <section className="rise rise-2 flex flex-col gap-3">
        <SectionTitle>Bloques de hoy (máx. 3)</SectionTitle>
        {today.blocks.map((block) => (
          <Card key={block.kind + block.title} className="flex items-center gap-3 px-4 py-3">
            <span className="text-lg text-star" aria-hidden>
              {BLOCK_ICONS[block.kind]}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{block.title}</p>
              <p className="text-xs text-dim">{block.description}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Chip>{block.estimatedMinutes} min</Chip>
              {block.kind === 'review' && (
                <Link href={`/${locale}/learn/${programCode}/review`} className="text-xs text-sky underline">
                  Ir a repasar
                </Link>
              )}
              {block.kind === 'voice_mission' && (
                <Link href={`/${locale}/learn/${programCode}/voice`} className="text-xs text-sky underline">
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
        <Card className="flex flex-col gap-4 px-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-dim">Meta semanal</span>
            <span>{today.weeklyGoalHours} h de práctica</span>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-dim">Voz con tu Mentor</span>
              <span>
                {today.voice.usedMinutes} / {today.voice.includedMinutes} min
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-raised">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${
                  voiceRatio >= 0.9 ? 'bg-risk' : voiceRatio >= 0.7 ? 'bg-warn' : 'bg-sky'
                }`}
                style={{ width: `${Math.min(100, voiceRatio * 100)}%` }}
              />
            </div>
            {today.voice.alertLevel !== null && (
              <p className="mt-1 text-xs text-warn">
                Has usado el {Math.round(today.voice.alertLevel * 100)}% de tus minutos. Tu apoderado
                también recibe este aviso.
              </p>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-dim">Repasos pendientes</span>
            <span>{today.dueReviews}</span>
          </div>
        </Card>
      </section>
    </div>
  );
}
