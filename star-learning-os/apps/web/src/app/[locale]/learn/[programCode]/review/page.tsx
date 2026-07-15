import { redirect } from 'next/navigation';
import type { ReviewQueueResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Card, Group, IconTile, SectionHeader } from '@/components/ui';
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
      <header className="rise">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight text-ink">Repasar</h1>
        <p className="mt-1 text-[15px] leading-relaxed text-dim">
          Recuperar lo aprendido en el momento justo — a 1, 3, 7, 14 y 30 días — convierte la
          práctica en dominio.
        </p>
      </header>

      <section className="rise rise-1">
        <SectionHeader>Pendientes de hoy</SectionHeader>
        {queue.dueItems.length === 0 ? (
          <Card className="px-5 py-8 text-center text-[15px] text-dim">
            Nada vencido por ahora. Los repasos aparecerán aquí cuando toque recuperarlos.
          </Card>
        ) : (
          <Group>
            {queue.dueItems.map((item) => (
              <div key={item.reviewItemId} className="flex items-center gap-3.5 px-4 py-3">
                <IconTile name="review" color="bg-gold" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-snug text-ink">{item.competencyDescriptor}</p>
                  <p className="mt-0.5 text-[13px] text-dim">Intervalo: {item.intervalDays} días</p>
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
              </div>
            ))}
          </Group>
        )}
      </section>
    </div>
  );
}
