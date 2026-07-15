import { redirect } from 'next/navigation';
import type { ReviewQueueResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Card, Chip, Icon, SectionTitle } from '@/components/ui';
import { StartLessonButton } from '@/components/start-lesson-button';

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  const enrollment = await resolveEnrollment(programCode);
  if (!enrollment) redirect(`/${locale}/login`);
  if (enrollment.status === 'pending_diagnostic') redirect(`/${locale}/learn/${programCode}/diagnostic`);

  const queue = await apiFetch<ReviewQueueResponse>(`/enrollments/${enrollment.id}/review-queue`);

  return (
    <div className="flex flex-col gap-7">
      <section className="rise">
        <p className="text-xs uppercase tracking-[0.14em] text-dim">Recuperación espaciada</p>
        <h1 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight text-ink">
          Repasar
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-dim">
          Volver a demostrar lo aprendido en el momento justo — a 1, 3, 7, 14 y 30 días — es lo que
          convierte la práctica en dominio.
        </p>
      </section>

      <section className="rise rise-1 flex flex-col gap-3">
        <SectionTitle>Pendientes de hoy</SectionTitle>
        {queue.dueItems.length === 0 && (
          <Card className="px-4 py-6 text-center text-sm text-dim">
            Nada vencido por ahora. Los repasos aparecerán aquí cuando toque recuperarlos.
          </Card>
        )}
        {queue.dueItems.map((item) => (
          <Card key={item.reviewItemId} className="flex items-center gap-4 px-4 py-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warn-soft text-warn">
              <Icon name="review" className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-ink">{item.competencyDescriptor}</p>
              <div className="mt-1.5 flex gap-1.5">
                <Chip tone="warn">Intervalo: {item.intervalDays} días</Chip>
              </div>
            </div>
            {item.lessonContractId && item.activityId && (
              <StartLessonButton
                locale={locale}
                programCode={programCode}
                enrollmentId={enrollment.id}
                lessonContractId={item.lessonContractId}
                label="Repasar"
                reviewItemId={item.reviewItemId}
                focusActivityId={item.activityId}
                compact
              />
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}
