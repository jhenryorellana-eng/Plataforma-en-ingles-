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
    <div className="mt-2.5">
      <div className="flex gap-5">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide('confirmed')}
          className="text-[15px] font-semibold text-ok-deep transition-opacity hover:opacity-70 disabled:opacity-40"
        >
          Confirmar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide('invalidated')}
          className="text-[15px] font-semibold text-risk transition-opacity hover:opacity-70 disabled:opacity-40"
        >
          Invalidar
        </button>
      </div>
      {error && <p className="mt-1 text-[12px] text-risk">{error}</p>}
    </div>
  );
}
