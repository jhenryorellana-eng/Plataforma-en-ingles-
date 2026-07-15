'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Icon } from './ui';

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

  // Tarjeta héroe estilo App Store "Today": llenado degradado, sin borde.
  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="group relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#7d7aff] via-[#5e5ce6] to-[#4b49d6] px-6 pb-6 pt-14 text-left text-white shadow-[0_12px_30px_rgba(94,92,230,0.35)] transition-transform active:scale-[0.99] disabled:opacity-70"
      >
        <span className="absolute left-6 top-5 text-[12px] font-bold uppercase tracking-[0.08em] text-white/70">
          {loading ? 'Preparando…' : 'Continúa donde ibas'}
        </span>
        <span className="block max-w-[26rem] pr-12 text-[26px] font-extrabold leading-[1.15] tracking-tight">
          {label}
        </span>
        {sublabel && (
          <span className="mt-1 block pr-14 text-[15px] font-medium leading-snug text-white/75">
            {sublabel}
          </span>
        )}
        <span className="absolute bottom-5 right-5 flex size-9 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform group-hover:translate-x-0.5">
          <Icon name="arrow" className="size-4.5 text-white" />
        </span>
      </button>
      {error && <p className="mt-2 text-sm text-risk">{error}</p>}
    </div>
  );
}
