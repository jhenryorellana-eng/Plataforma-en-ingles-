'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';

interface SafetyCaseActionsProps {
  caseId: string;
  status: 'open' | 'triaged';
}

export function SafetyCaseActions({ caseId, status }: SafetyCaseActionsProps) {
  const router = useRouter();
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(nextStatus: 'triaged' | 'resolved') {
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/admin/safety/cases/${caseId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          ...(nextStatus === 'resolved' ? { resolution } : {}),
        }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar el caso');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {status === 'open' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void update('triaged')}
          className="self-start rounded-full bg-gold-soft px-3 py-1.5 text-[12px] font-semibold text-gold-deep disabled:opacity-40"
        >
          Marcar como triado
        </button>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-semibold text-dim">Resolución del caso</span>
        <textarea
          value={resolution}
          onChange={(event) => setResolution(event.target.value)}
          maxLength={2000}
          rows={2}
          placeholder="Acción tomada y motivo…"
          className="rounded-xl bg-mist px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>
      <button
        type="button"
        disabled={busy || resolution.trim().length < 3}
        onClick={() => void update('resolved')}
        className="self-start rounded-full bg-ok px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
      >
        Resolver y cerrar
      </button>
      {error && <p role="alert" className="text-[12px] text-risk">{error}</p>}
    </div>
  );
}
