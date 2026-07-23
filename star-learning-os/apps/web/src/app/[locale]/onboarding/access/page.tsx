'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zChangeInitialPasswordResponse } from '@star/contracts';
import { clientApi, clientApiValidated } from '@/lib/client-api';
import { AuroraSurface } from '@/components/aurora/aurora-hero';
import { IconTile, Wordmark } from '@/components/ui';

export default function AccessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordsMatch = password.length >= 8 && password === confirmation;

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordsMatch || busy || leaving) return;
    setBusy(true);
    setError(null);
    try {
      const me = await clientApiValidated(
        zChangeInitialPasswordResponse,
        '/auth/change-initial-password',
        {
          method: 'POST',
          body: JSON.stringify({ password }),
        },
      );
      setPassword('');
      setConfirmation('');
      router.replace(
        me.nextAction === 'youth_assent' ? `/${locale}/onboarding/assent` : `/${locale}/learn`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos guardar tu nueva contraseña');
      setBusy(false);
    }
  }

  async function logout() {
    if (busy || leaving) return;
    setLeaving(true);
    setError(null);
    try {
      await clientApi('/auth/logout', { method: 'POST' });
    } catch {
      // Salir no debe dejar al estudiante atrapado si la API está intermitente.
    } finally {
      router.replace(`/${locale}/login`);
    }
  }

  const inputClass =
    'mt-2 min-h-12 w-full rounded-xl border border-line bg-mist px-4 py-3 text-[16px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/45';

  return (
    <div className="mission-shell min-h-dvh overflow-x-clip">
      <header className="material-bar border-b border-line/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Wordmark />
          <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">
            Tu acceso personal
          </span>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-65px)] max-w-3xl items-center px-4 py-8 sm:px-6">
        <AuroraSurface className="rise w-full overflow-hidden" tone="blue">
          <div className="border-b border-line px-5 py-6 text-center sm:px-9 sm:py-8">
            <IconTile
              name="lock"
              color="bg-primary"
              className="mx-auto size-12 rounded-2xl [&>svg]:size-6"
            />
            <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-teal">
              Antes de continuar
            </p>
            <h1 className="mx-auto mt-2 max-w-[18ch] text-[clamp(2rem,7vw,3.4rem)] font-extrabold leading-[0.96] tracking-[-0.05em] text-ink text-balance">
              Crea una contraseña que solo tú conozcas.
            </h1>
            <p className="mx-auto mt-4 max-w-[54ch] text-[13px] leading-relaxed text-dim">
              Tu apoderado creó un acceso temporal para entregártelo. Ahora lo reemplazarás por una
              contraseña privada. No se la mostraremos a tu familia ni al equipo de la plataforma.
            </p>
          </div>

          <form onSubmit={changePassword} className="mx-auto max-w-xl px-5 py-6 sm:px-9 sm:py-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-[12px] font-bold text-ink">Nueva contraseña</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="text-[12px] font-bold text-ink">Repítela</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  aria-invalid={confirmation.length > 0 && !passwordsMatch}
                  className={inputClass}
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[10.5px] leading-relaxed text-dim">
                Usa al menos 8 caracteres y no repitas la contraseña temporal.
              </p>
              <button
                type="button"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
                className="min-h-10 rounded-xl border border-line bg-surface px-3 text-[12px] font-bold text-primary"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>

            {error && (
              <p
                className="mt-4 rounded-xl bg-risk-soft px-3 py-2.5 text-[12px] font-medium leading-relaxed text-risk"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!passwordsMatch || busy || leaving}
              className="tactile-button mt-5 min-h-14 w-full rounded-2xl px-5 text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? 'Protegiendo tu cuenta…' : 'Guardar mi contraseña privada'}
            </button>
            <button
              type="button"
              disabled={busy || leaving}
              onClick={() => void logout()}
              className="mt-3 min-h-11 w-full rounded-xl text-[13px] font-bold text-dim hover:text-ink disabled:cursor-wait disabled:opacity-50"
            >
              {leaving ? 'Cerrando sesión…' : 'Salir y hacerlo después'}
            </button>
          </form>
        </AuroraSurface>
      </main>
    </div>
  );
}
