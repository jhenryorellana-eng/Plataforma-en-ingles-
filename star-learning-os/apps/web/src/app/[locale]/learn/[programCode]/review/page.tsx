import { redirect } from 'next/navigation';
import type { ReviewQueueResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Card, Chip, SectionTitle } from '@/components/ui';
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
    <div className="flex flex-col gap-6">
      <section className="rise">
        <p className="text-sm text-dim">Recuperación espaciada</p>
        <h1 className="font-display text-2xl font-semibold">Repasar</h1>
        <p className="mt-1 text-sm text-dim">
          Volver a demostrar lo aprendido en el momento justo (1, 3, 7, 14 y 30 días) es lo que
          convierte práctica en dominio.
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
          <Card key={item.reviewItemId} className="flex items-center gap-3 px-4 py-3">
            <span className="text-warn" aria-hidden>
              ↻
            </span>
            <div className="flex-1">
              <p className="text-sm">{item.competencyDescriptor}</p>
              <div className="mt-1 flex gap-2">
                <Chip tone="warn">Intervalo: {item.intervalDays} d</Chip>
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
