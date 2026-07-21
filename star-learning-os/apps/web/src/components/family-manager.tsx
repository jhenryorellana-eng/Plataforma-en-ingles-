'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { AuroraSurface } from './aurora/aurora-hero';
import { Icon, IconTile } from './ui';

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
    <AuroraSurface className="overflow-hidden" tone="gold">
      <form
        className="p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void accept();
        }}
      >
        <div className="flex items-start gap-3.5">
          <IconTile name="route" color="bg-gold" className="mt-0.5" />
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-gold-deep">
              Nueva conexión
            </p>
            <h2 className="mt-1 text-[18px] font-extrabold tracking-tight text-ink">
              Vincular a un estudiante
            </h2>
            <p id="invitation-code-hint" className="mt-1 text-[12px] leading-relaxed text-dim">
              Escribe el código de ocho caracteres que te compartió directamente.
            </p>
          </div>
        </div>

        <label htmlFor="invitation-code" className="mt-4 block text-[12px] font-bold text-ink">
          Código de invitación
        </label>
        <div className="mt-2 flex flex-col gap-2.5 min-[520px]:flex-row">
          <input
            id="invitation-code"
            name="invitation-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            minLength={8}
            maxLength={8}
            aria-describedby="invitation-code-hint"
            aria-invalid={Boolean(error)}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-mist px-4 py-2.5 text-center text-[16px] font-extrabold tracking-[0.15em] text-ink placeholder:font-normal placeholder:tracking-normal placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50 min-[520px]:text-left"
          />
          <button
            type="submit"
            disabled={busy || code.trim().length !== 8}
            className="tactile-button min-h-12 w-full rounded-xl px-5 text-[14px] font-extrabold text-white disabled:opacity-45 min-[520px]:w-auto"
          >
            {busy ? 'Vinculando…' : 'Vincular'}
          </button>
        </div>

        {message && (
          <p
            className="mt-3 flex items-start gap-2 rounded-xl bg-ok-soft px-3 py-2.5 text-[12px] font-medium leading-relaxed text-ok-deep"
            role="status"
            aria-live="polite"
          >
            <Icon name="check" className="mt-0.5 size-4 shrink-0" />
            {message}
          </p>
        )}
        {error && (
          <p
            className="mt-3 rounded-xl bg-risk-soft px-3 py-2.5 text-[12px] font-medium leading-relaxed text-risk"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
      </form>
    </AuroraSurface>
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
  const [message, setMessage] = useState<string | null>(null);

  async function toggle(purpose: string, isGranted: boolean) {
    setBusyPurpose(purpose);
    setError(null);
    setMessage(null);
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
      const purposeLabel = PURPOSES.find((item) => item.purpose === purpose)?.label ?? 'Permiso';
      setMessage(`${purposeLabel}: ${isGranted ? 'revocado' : 'otorgado'}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el permiso');
    } finally {
      setBusyPurpose(null);
    }
  }

  return (
    <AuroraSurface className="overflow-hidden" tone="neutral">
      {PURPOSES.map((item) => {
        const isGranted = granted.includes(item.purpose);
        const isBusy = busyPurpose === item.purpose;
        return (
          <div
            key={item.purpose}
            className="flex min-h-[72px] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-[14px] font-bold text-ink">{item.label}</p>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wide ${
                    isGranted ? 'text-ok-deep' : 'text-dim'
                  }`}
                >
                  {isBusy ? 'Actualizando…' : isGranted ? 'Otorgado' : 'No otorgado'}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-dim">{item.detail}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isGranted}
              aria-label={`${item.label}: ${isGranted ? 'otorgado' : 'no otorgado'}. ${
                isGranted ? 'Revocar permiso' : 'Otorgar permiso'
              }`}
              aria-busy={isBusy}
              disabled={busyPurpose !== null}
              onClick={() => toggle(item.purpose, isGranted)}
              className="flex min-h-11 w-16 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait"
            >
              <span
                className={`relative block h-8 w-14 rounded-full transition-colors ${
                  isGranted ? 'bg-ok' : 'bg-fill'
                } ${isBusy ? 'opacity-50' : ''}`}
                aria-hidden
              >
                <span
                  className={`absolute top-[3px] size-[26px] rounded-full bg-white shadow transition-[left] ${
                    isGranted ? 'left-[27px]' : 'left-[3px]'
                  }`}
                />
              </span>
            </button>
          </div>
        );
      })}
      {message && (
        <p
          className="border-t border-line px-4 py-3 text-[12px] font-medium text-ok-deep"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          className="border-t border-line px-4 py-3 text-[12px] font-medium text-risk"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}
    </AuroraSurface>
  );
}
