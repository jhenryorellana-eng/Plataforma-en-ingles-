'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';

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
          className="rounded-lg border border-star/50 px-3 py-1.5 text-xs text-star transition-colors hover:bg-star/10 disabled:opacity-50"
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
        className="group w-full rounded-2xl bg-gradient-to-r from-star-deep via-star to-star-deep px-6 py-5 text-left text-night shadow-[0_0_40px_rgba(255,201,77,0.25)] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
      >
        <span className="block font-display text-lg font-semibold">
          {loading ? 'Preparando tu misión…' : label} <span aria-hidden>→</span>
        </span>
        {sublabel && <span className="mt-0.5 block text-sm text-night/70">{sublabel}</span>}
      </button>
      {error && <p className="mt-2 text-sm text-risk">{error}</p>}
    </div>
  );
}
