import { Suspense } from 'react';
import { LessonPlayer } from './player';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string; sessionId: string }>;
}) {
  const { locale, programCode, sessionId } = await params;
  return (
    <Suspense fallback={<p className="mt-16 text-center text-sm text-dim">Cargando tu lección…</p>}>
      <LessonPlayer locale={locale} programCode={programCode} sessionId={sessionId} />
    </Suspense>
  );
}
