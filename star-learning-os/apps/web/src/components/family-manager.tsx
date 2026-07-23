'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zResetManagedLearnerPasswordResponse } from '@star/contracts';
import { clientApi, clientApiValidated } from '@/lib/client-api';
import { AuroraSurface } from './aurora/aurora-hero';
import { Icon, IconTile } from './ui';

/** Compatibilidad con alumnos que iniciaron el recorrido learner-first anterior. */
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
              Recorrido anterior
            </p>
            <h2 className="mt-1 text-[18px] font-extrabold tracking-tight text-ink">
              Vincular con un código existente
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

interface ManagedLearnerAccessProps {
  learnerId: string;
  displayName: string;
  loginName: string;
  mustChangePassword: boolean;
}

interface OneTimeAccess {
  loginName: string;
  password: string;
}

const accessInputClass =
  'mt-2 min-h-12 w-full rounded-xl border border-line bg-mist px-4 py-3 text-[16px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/45';

/** Recuperación administrada: la contraseña temporal existe solo en memoria de esta vista. */
export function ManagedLearnerAccess({
  learnerId,
  displayName,
  loginName,
  mustChangePassword,
}: ManagedLearnerAccessProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [oneTimeAccess, setOneTimeAccess] = useState<OneTimeAccess | null>(null);
  const passwordsMatch = password.length >= 8 && password.length <= 72 && password === confirmation;

  function startReset() {
    setEditing(true);
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
    setError(null);
  }

  function cancelReset() {
    setEditing(false);
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
    setError(null);
  }

  async function resetAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordsMatch || busy) return;
    const submittedPassword = password;
    setBusy(true);
    setError(null);
    try {
      const result = await clientApiValidated(
        zResetManagedLearnerPasswordResponse,
        `/guardian/learners/${learnerId}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({ password: submittedPassword }),
        },
      );
      if (result.learnerId !== learnerId || result.loginName !== loginName) {
        throw new Error('La respuesta no corresponde a esta cuenta. Recarga la página.');
      }
      setOneTimeAccess({ loginName: result.loginName, password: submittedPassword });
      setPassword('');
      setConfirmation('');
      setShowPassword(false);
      setEditing(false);
      setCopyMessage(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos regenerar el acceso');
    } finally {
      setBusy(false);
    }
  }

  async function copyAccess() {
    if (!oneTimeAccess) return;
    try {
      await navigator.clipboard.writeText(
        `Acceso StarbizAcademy para ${displayName}\nUsuario: ${oneTimeAccess.loginName}\nContraseña temporal: ${oneTimeAccess.password}`,
      );
      setCopyMessage('Acceso copiado. Compártelo únicamente de forma privada.');
    } catch {
      setCopyMessage('No pudimos copiarlo. Selecciona los datos y cópialos manualmente.');
    }
  }

  if (oneTimeAccess) {
    return (
      <AuroraSurface className="mb-4 overflow-hidden" tone="gold">
        <div className="border-b border-line px-4 py-4 sm:px-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-gold-deep">
            Guarda este acceso ahora
          </p>
          <h3 className="mt-1 text-[16px] font-extrabold text-ink">
            Nueva contraseña temporal de {displayName}
          </h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
            No volveremos a mostrarla. Todas sus sesiones anteriores ya fueron revocadas y deberá
            crear una contraseña privada cuando vuelva a entrar.
          </p>
        </div>
        <dl className="grid gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-5">
          <div className="rounded-xl border border-line bg-mist px-3.5 py-3">
            <dt className="text-[9px] font-extrabold uppercase tracking-wide text-dim">Usuario</dt>
            <dd className="mt-1 select-all break-all font-mono text-[14px] font-extrabold text-ink">
              {oneTimeAccess.loginName}
            </dd>
          </div>
          <div className="rounded-xl border border-line bg-mist px-3.5 py-3">
            <dt className="text-[9px] font-extrabold uppercase tracking-wide text-dim">
              Contraseña temporal
            </dt>
            <dd className="mt-1 select-all break-all font-mono text-[14px] font-extrabold text-ink">
              {oneTimeAccess.password}
            </dd>
          </div>
        </dl>
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-2 min-[480px]:flex-row">
            <button
              type="button"
              onClick={() => void copyAccess()}
              className="tactile-button min-h-11 flex-1 rounded-xl px-4 text-[13px] font-extrabold text-white"
            >
              Copiar acceso
            </button>
            <button
              type="button"
              onClick={() => {
                setOneTimeAccess(null);
                setCopyMessage(null);
              }}
              className="min-h-11 flex-1 rounded-xl border border-line bg-surface px-4 text-[13px] font-extrabold text-ink hover:bg-mist"
            >
              Ya lo guardé
            </button>
          </div>
          {copyMessage && (
            <p className="mt-2.5 text-center text-[10.5px] leading-relaxed text-dim" role="status">
              {copyMessage}
            </p>
          )}
        </div>
      </AuroraSurface>
    );
  }

  return (
    <AuroraSurface className="mb-4 overflow-hidden" tone="neutral">
      <div className="flex flex-col gap-3 px-4 py-4 min-[480px]:flex-row min-[480px]:items-center sm:px-5">
        <IconTile name="lock" color="bg-primary" className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">
            Acceso del estudiante
          </p>
          <p className="mt-1 break-all font-mono text-[14px] font-extrabold text-ink">
            {loginName}
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-dim">
            {mustChangePassword
              ? 'Tiene una contraseña temporal pendiente de cambio.'
              : 'El estudiante ya creó su contraseña privada.'}
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startReset}
            className="min-h-11 shrink-0 rounded-xl border border-line bg-surface px-4 text-[12px] font-extrabold text-primary hover:bg-primary-soft"
          >
            Regenerar acceso
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={resetAccess} className="border-t border-line bg-surface px-4 py-4 sm:px-5">
          <div className="rounded-xl border border-warn/25 bg-warn-soft px-3.5 py-3 text-[11.5px] font-medium leading-relaxed text-gold-deep">
            Al confirmar, cerraremos de inmediato todas sus sesiones y la contraseña actual dejará
            de funcionar. La nueva será temporal: el estudiante tendrá que cambiarla al ingresar.
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-[11.5px] font-bold text-ink">Nueva contraseña temporal</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                className={accessInputClass}
              />
            </label>
            <label>
              <span className="text-[11.5px] font-bold text-ink">Repite la contraseña</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                aria-invalid={confirmation.length > 0 && !passwordsMatch}
                className={accessInputClass}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10.5px] leading-relaxed text-dim">Mínimo 8 caracteres.</span>
            <button
              type="button"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
              className="min-h-9 rounded-lg border border-line px-3 text-[11px] font-bold text-primary"
            >
              {showPassword ? 'Ocultar' : 'Mostrar'} contraseñas
            </button>
          </div>
          {error && (
            <p
              className="mt-3 rounded-xl bg-risk-soft px-3 py-2.5 text-[11.5px] font-medium leading-relaxed text-risk"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 min-[480px]:flex-row-reverse">
            <button
              type="submit"
              disabled={!passwordsMatch || busy}
              className="tactile-button min-h-11 flex-1 rounded-xl px-4 text-[12.5px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? 'Regenerando…' : 'Confirmar y cerrar sus sesiones'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={cancelReset}
              className="min-h-11 flex-1 rounded-xl border border-line px-4 text-[12.5px] font-bold text-dim hover:text-ink disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
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

const ESSENTIAL_PURPOSES = new Set(['service', 'storage']);

/** Consentimientos por finalidad separada (CNS-01): otorgar y revocar. */
export function ConsentToggles({ learnerId, granted }: { learnerId: string; granted: string[] }) {
  const router = useRouter();
  const [busyPurpose, setBusyPurpose] = useState<string | null>(null);
  const [pendingEssentialRevocation, setPendingEssentialRevocation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const voiceGranted = granted.includes('ai_voice');
  const transferGranted = granted.includes('international_transfer');

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
        const requiresRevocationConfirmation = isGranted && ESSENTIAL_PURPOSES.has(item.purpose);
        const isAwaitingConfirmation = pendingEssentialRevocation === item.purpose;
        const dependencyBlocked =
          (item.purpose === 'ai_voice' && !isGranted && !transferGranted) ||
          (item.purpose === 'international_transfer' && isGranted && voiceGranted);
        const dependencyHint =
          item.purpose === 'ai_voice' && !isGranted && !transferGranted
            ? 'Autoriza primero el procesamiento internacional para habilitar la voz.'
            : item.purpose === 'international_transfer' && isGranted && voiceGranted
              ? 'Revoca primero Voz con IA para retirar este permiso.'
              : null;
        return (
          <div key={item.purpose} className="border-b border-line last:border-b-0">
            <div className="flex min-h-[72px] items-center gap-3 px-4 py-3 sm:px-5">
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
                {dependencyHint && (
                  <p className="mt-1 text-[10.5px] font-medium leading-snug text-gold-deep">
                    {dependencyHint}
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isGranted}
                aria-label={`${item.label}: ${isGranted ? 'otorgado' : 'no otorgado'}. ${
                  isGranted ? 'Revocar permiso' : 'Otorgar permiso'
                }`}
                aria-busy={isBusy}
                disabled={
                  busyPurpose !== null || pendingEssentialRevocation !== null || dependencyBlocked
                }
                onClick={() => {
                  if (requiresRevocationConfirmation) {
                    setPendingEssentialRevocation(item.purpose);
                    setError(null);
                    setMessage(null);
                    return;
                  }
                  void toggle(item.purpose, isGranted);
                }}
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
            {isAwaitingConfirmation && (
              <div className="border-t border-line bg-warn-soft px-4 py-3.5 sm:px-5">
                <p className="text-[11.5px] font-medium leading-relaxed text-gold-deep">
                  {item.label} es un permiso esencial. Si lo revocas, parte del aprendizaje quedará
                  bloqueada hasta que vuelvas a autorizarlo.
                </p>
                <div className="mt-3 flex flex-col gap-2 min-[480px]:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingEssentialRevocation(null);
                      void toggle(item.purpose, true);
                    }}
                    className="min-h-10 flex-1 rounded-xl bg-risk px-3 text-[11.5px] font-extrabold text-white"
                  >
                    Sí, revocar {item.label.toLowerCase()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingEssentialRevocation(null)}
                    className="min-h-10 flex-1 rounded-xl border border-line bg-surface px-3 text-[11.5px] font-extrabold text-ink"
                  >
                    Mantener permiso
                  </button>
                </div>
              </div>
            )}
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
