import { redirect } from 'next/navigation';
import type { EnrollmentResponse } from '@star/contracts';
import { apiFetchOrNull } from '@/lib/api';

export default async function LearnDispatcher({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const enrollments = await apiFetchOrNull<EnrollmentResponse[]>('/enrollments');
  if (enrollments === null) redirect(`/${locale}/login`);

  const active = enrollments.find((enrollment) =>
    ['active', 'pending_diagnostic', 'paused'].includes(enrollment.status),
  );
  if (!active) redirect(`/${locale}/enroll`);
  if (active.status === 'pending_diagnostic') {
    redirect(`/${locale}/learn/${active.program.code}/diagnostic`);
  }
  redirect(`/${locale}/learn/${active.program.code}/today`);
}
