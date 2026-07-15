'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';

export function ReviewDecisionButtons({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'confirmed' | 'invalidated') {
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/human-reviews/${reviewId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          reason:
            decision === 'confirmed'
              ? 'Evidencia revisada: la recomendación del sistema es consistente.'
              : 'Evidencia insuficiente o inconsistente: se invalida la decisión propuesta.',
        }),
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la decisión');
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide('confirmed')}
          className="rounded-lg border border-ok/40 bg-ok-soft px-3.5 py-1.5 text-xs font-medium text-ok transition-colors hover:bg-ok hover:text-white disabled:opacity-50"
        >
          Confirmar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide('invalidated')}
          className="rounded-lg border border-risk/40 bg-risk-soft px-3.5 py-1.5 text-xs font-medium text-risk transition-colors hover:bg-risk hover:text-white disabled:opacity-50"
        >
          Invalidar
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-risk">{error}</p>}
    </div>
  );
}
