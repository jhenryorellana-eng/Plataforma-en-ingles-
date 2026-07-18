'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { Icon } from './ui';

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
    <div className="mt-4">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide('confirmed')}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ok px-4 py-2.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(47,191,95,0.35)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-40"
        >
          <Icon name="check" className="size-4.5" />
          Confirmar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide('invalidated')}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-risk/25 bg-risk-soft px-4 py-2.5 text-[15px] font-semibold text-risk transition-all hover:brightness-95 active:scale-[0.99] disabled:opacity-40"
        >
          <Icon name="exit" className="size-4.5" />
          Invalidar
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-risk">{error}</p>}
    </div>
  );
}
