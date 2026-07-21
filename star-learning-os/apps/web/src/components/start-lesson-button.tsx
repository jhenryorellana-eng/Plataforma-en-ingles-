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
          className="min-h-11 rounded-xl px-3 text-[15px] font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-40"
        >
          {loading ? 'Abriendo…' : label}
        </button>
        {error && <p role="alert" className="mt-1 text-[12px] text-risk">{error}</p>}
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
        className="mission-hero group w-full rounded-[28px] px-5 pb-5 pt-5 text-left text-white transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.995] disabled:opacity-70 sm:px-6 sm:pb-6 sm:pt-6"
      >
        <StarMark className="star-float pointer-events-none absolute -right-6 -top-5 size-32 text-white/10" />
        <StarMark className="pointer-events-none absolute right-20 top-20 size-4 text-gold/70" />
        <span className="mission-kicker relative inline-flex items-center gap-1.5 text-[10px] text-white/70">
          <StarMark className="size-3 text-white" />
          {loading ? 'Preparando…' : 'Sigue tu misión'}
        </span>
        <span className="relative mt-7 block max-w-[28rem] pr-8 text-[27px] font-extrabold leading-[1.08] tracking-[-0.035em] drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] sm:text-[31px]">
          {label}
        </span>
        {sublabel && (
          <span className="relative mt-2 block max-w-[34rem] pr-4 text-[14px] font-medium leading-relaxed text-white/74 sm:text-[15px]">
            {sublabel}
          </span>
        )}
        <span className="relative mt-6 flex items-center justify-between gap-3 border-t border-white/12 pt-4">
          <span className="text-[13px] font-bold text-white">Continuar misión</span>
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-[#3443b3] shadow-[0_4px_0_rgba(12,25,72,0.45)] transition-transform group-hover:translate-x-0.5">
            <Icon name="arrow" className="size-4.5" />
          </span>
        </span>
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-risk">{error}</p>}
    </div>
  );
}
