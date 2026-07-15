import { redirect } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { apiFetchOrNull } from '@/lib/api';

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const me = await apiFetchOrNull<MeResponse>('/auth/me');
  if (!me) redirect(`/${locale}/login`);
  if (me.role === 'guardian') redirect(`/${locale}/family`);
  if (me.role === 'staff') redirect(`/${locale}/staff`);
  redirect(`/${locale}/learn`);
}
