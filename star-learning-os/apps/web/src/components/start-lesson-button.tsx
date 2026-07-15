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
      <div>
        <button
          type="button"
          onClick={start}
          disabled={loading}
          className="rounded-lg border border-primary/40 bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-surface disabled:opacity-50"
        >
          {loading ? 'Abriendo…' : label}
        </button>
        {error && <p className="mt-1 text-xs text-risk">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="group flex w-full items-center justify-between rounded-xl bg-primary px-6 py-5 text-left text-surface shadow-[0_6px_18px_rgba(36,64,142,0.25)] transition-all hover:bg-primary-deep active:translate-y-px disabled:opacity-60"
      >
        <span>
          <span className="block font-display text-lg font-semibold">
            {loading ? 'Preparando tu sesión…' : label}
          </span>
          {sublabel && <span className="mt-0.5 block text-sm text-surface/75">{sublabel}</span>}
        </span>
        <Icon name="arrow" className="size-5 transition-transform group-hover:translate-x-1" />
      </button>
      {error && <p className="mt-2 text-sm text-risk">{error}</p>}
    </div>
  );
}
