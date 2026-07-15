'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { Card } from './ui';

/** El apoderado vincula a un alumno con el código de invitación (Stack §5.2). */
export function AcceptInvitationCard() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await clientApi<{ learnerName: string }>('/family-invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      setMessage(`Vínculo creado con ${result.learnerName}. Ahora otorga sus permisos abajo.`);
      setCode('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo aceptar la invitación');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="px-4 py-4">
      <p className="text-[15px] font-semibold text-ink">Vincular a un alumno</p>
      <p className="mt-0.5 text-[13px] leading-snug text-dim">
        Escribe el código que te compartió tu hijo/a.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="CÓDIGO"
          maxLength={8}
          className="min-w-0 flex-1 rounded-xl bg-mist px-4 py-2.5 text-[16px] font-semibold tracking-[0.15em] text-ink placeholder:font-normal placeholder:tracking-normal placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          disabled={busy || code.trim().length < 4}
          onClick={accept}
          className="rounded-xl bg-primary px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
        >
          {busy ? '…' : 'Aceptar'}
        </button>
      </div>
      {message && <p className="mt-2 text-[13px] text-ok-deep">{message}</p>}
      {error && <p className="mt-2 text-[13px] text-risk">{error}</p>}
    </Card>
  );
}

const PURPOSES: Array<{ purpose: string; label: string; detail: string }> = [
  { purpose: 'service', label: 'Servicio', detail: 'Usar la plataforma y estudiar' },
  { purpose: 'ai_voice', label: 'Voz con IA', detail: 'Conversar con el Mentor por voz' },
  { purpose: 'storage', label: 'Almacenamiento', detail: 'Guardar evidencia de aprendizaje' },
  {
    purpose: 'international_transfer',
    label: 'Transferencia internacional',
    detail: 'Procesamiento de IA fuera del país',
  },
];

/** Consentimientos por finalidad separada (CNS-01): otorgar y revocar. */
export function ConsentToggles({ learnerId, granted }: { learnerId: string; granted: string[] }) {
  const router = useRouter();
  const [busyPurpose, setBusyPurpose] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(purpose: string, isGranted: boolean) {
    setBusyPurpose(purpose);
    setError(null);
    try {
      if (isGranted) {
        await clientApi('/consents/revoke', {
          method: 'POST',
          body: JSON.stringify({ learnerId, purpose }),
        });
      } else {
        await clientApi('/consents', {
          method: 'POST',
          body: JSON.stringify({ learnerId, purposes: [purpose] }),
        });
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el permiso');
    } finally {
      setBusyPurpose(null);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)] [&>*+*]:border-t [&>*+*]:border-line">
      {PURPOSES.map((item) => {
        const isGranted = granted.includes(item.purpose);
        return (
          <div key={item.purpose} className="flex items-center gap-3.5 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-ink">{item.label}</p>
              <p className="text-[12px] leading-snug text-dim">{item.detail}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isGranted}
              disabled={busyPurpose !== null}
              onClick={() => toggle(item.purpose, isGranted)}
              className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors ${
                isGranted ? 'bg-ok' : 'bg-fill'
              } ${busyPurpose === item.purpose ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-[2px] size-[26px] rounded-full bg-white shadow transition-[left] ${
                  isGranted ? 'left-[22px]' : 'left-[2px]'
                }`}
              />
            </button>
          </div>
        );
      })}
      {error && <p className="px-4 py-2 text-[13px] text-risk">{error}</p>}
    </div>
  );
}
