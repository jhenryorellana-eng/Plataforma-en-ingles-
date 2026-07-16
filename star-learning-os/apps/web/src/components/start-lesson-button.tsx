'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Icon, StarMark } from './ui';

export function StartLessonButton({
  locale,
  programCode,
  enrollmentId,
  lessonContractId,
  label,
  sublabel,
  reviewItemId,
  focusActivityId,
  compact = false,
}: {
  locale: string;
  programCode: string;
  enrollmentId: string;
  lessonContractId: string;
  label: string;
  sublabel?: string;
  reviewItemId?: string;
  focusActivityId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const session = await clientApi<SessionResponse>(`/enrollments/${enrollmentId}/sessions`, {
        method: 'POST',
        body: JSON.stringify({ lessonContractId }),
      });
      const query = new URLSearchParams();
      if (reviewItemId) query.set('reviewItemId', reviewItemId);
      if (focusActivityId) query.set('focusActivityId', focusActivityId);
      const suffix = query.size > 0 ? `?${query.toString()}` : '';
      router.push(`/${locale}/learn/${programCode}/lesson/${session.id}${suffix}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la lección');
      setLoading(false);
    }
  }

  if (compact) {
    return (
      <div className="text-right">
        <button
          type="button"
          onClick={start}
          disabled={loading}
          className="text-[15px] font-semibold text-primary transition-opacity hover:opacity-70 disabled:opacity-40"
        >
          {loading ? 'Abriendo…' : label}
        </button>
        {error && <p className="mt-1 text-[12px] text-risk">{error}</p>}
      </div>
    );
  }

  // Tarjeta héroe estilo App Store "Today": degradado de marca, estrella flotante.
  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="sheen group relative w-full overflow-hidden rounded-3xl px-6 pb-6 pt-14 text-left text-white shadow-[0_16px_38px_rgba(94,92,230,0.42),inset_0_1px_0_rgba(255,255,255,0.25)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(340px 200px at 90% -20%, rgba(23,184,205,0.5), transparent 65%), linear-gradient(120deg, #7c7aff 0%, #5e5ce6 55%, #4b49d6 100%)',
        }}
      >
        <StarMark className="star-float pointer-events-none absolute -right-7 -top-9 size-36 text-white/12" />
        <StarMark className="pointer-events-none absolute right-16 top-10 size-5 text-white/25" />
        <span className="absolute left-6 top-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white/90 backdrop-blur">
          <StarMark className="size-3 text-white" />
          {loading ? 'Preparando…' : 'Continúa donde ibas'}
        </span>
        <span className="relative block max-w-[26rem] pr-12 text-[27px] font-extrabold leading-[1.12] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
          {label}
        </span>
        {sublabel && (
          <span className="relative mt-1.5 block pr-14 text-[15px] font-medium leading-snug text-white/80">
            {sublabel}
          </span>
        )}
        <span className="absolute bottom-5 right-5 flex size-10 items-center justify-center rounded-full bg-white text-primary shadow-lg transition-transform group-hover:translate-x-0.5 group-hover:scale-105">
          <Icon name="arrow" className="size-4.5" />
        </span>
      </button>
      {error && <p className="mt-2 text-sm text-risk">{error}</p>}
    </div>
  );
}
