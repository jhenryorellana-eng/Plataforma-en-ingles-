'use client';

import { use, useEffect, useState } from 'react';
import type { ResetPasswordResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { PublicShell } from '@/components/public-shell';
import { AppIcon, Card, Icon } from '@/components/ui';

type RecoveryState =
  | { kind: 'checking' }
  | { kind: 'ready'; accessToken: string }
  | { kind: 'invalid' }
  | { kind: 'complete' };

export default function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [recovery, setRecovery] = useState<RecoveryState>({ kind: 'checking' });
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    // El flujo implícito de Supabase entrega el bearer en el fragmento para que
    // nunca viaje al servidor, CDN ni logs de acceso. No aceptamos access_token
    // por query string aunque un enlace manipulado intente incluirlo allí.
    const accessToken = fragment.get('access_token');
    const type = fragment.get('type');
    const providerError =
      fragment.get('error') ??
      fragment.get('error_code') ??
      query.get('error') ??
      query.get('error_code');

    // El token deja de estar visible en la URL/historial apenas se captura en memoria.
    window.history.replaceState(null, '', window.location.pathname);

    if (
      providerError ||
      type !== 'recovery' ||
      !accessToken ||
      accessToken.length < 32 ||
      accessToken.length > 8192
    ) {
      setRecovery({ kind: 'invalid' });
      return;
    }
    setRecovery({ kind: 'ready', accessToken });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (recovery.kind !== 'ready') return;
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await clientApi<ResetPasswordResponse>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          accessToken: recovery.accessToken,
          type: 'recovery',
          password,
        }),
      });
      setPassword('');
      setConfirmation('');
      setRecovery({ kind: 'complete' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo actualizar la contraseña.');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-xl bg-mist px-4 py-3 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <PublicShell>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-12">
        <div className="rise flex flex-col items-center text-center">
          <AppIcon className="size-14" />
          <h1 className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
            Crea una contraseña nueva
          </h1>
          <p className="mt-1.5 max-w-[34ch] text-[14px] leading-relaxed text-dim">
            Al guardar, cerraremos todas tus sesiones de StarbizAcademy para proteger tu cuenta.
          </p>
        </div>

        {recovery.kind === 'checking' && (
          <div role="status">
            <Card className="rise rise-1 mt-7 px-5 py-6 text-center">
              <p className="text-[14px] text-dim">Validando tu enlace…</p>
            </Card>
          </div>
        )}

        {recovery.kind === 'invalid' && (
          <Card className="rise rise-1 mt-7 flex flex-col items-center px-5 py-7 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-risk-soft">
              <Icon name="lock" className="size-7 text-risk" />
            </span>
            <h2 className="mt-4 text-[18px] font-bold text-ink">El enlace no es válido</h2>
            <p className="mt-2 max-w-[32ch] text-[14px] leading-relaxed text-dim">
              Puede haber expirado o ya haberse usado. Solicita uno nuevo desde el inicio de sesión.
            </p>
            <a
              href={`/${locale}/login`}
              className="btn-gradient mt-5 w-full rounded-2xl py-3.5 text-[16px] font-semibold text-white"
            >
              Solicitar otro enlace
            </a>
          </Card>
        )}

        {recovery.kind === 'ready' && (
          <form onSubmit={submit} className="rise rise-1 mt-7 flex flex-col gap-4">
            <Card className="flex flex-col gap-4 px-5 py-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-dim">Contraseña nueva</span>
                <span className="relative block">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className={`${inputClass} pr-20`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-primary"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-dim">Repite la contraseña</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className={inputClass}
                />
              </label>
            </Card>
            <button
              type="submit"
              disabled={busy || password.length < 8 || confirmation.length < 8}
              className="btn-gradient w-full rounded-2xl py-3.5 text-[17px] font-semibold text-white disabled:opacity-40"
            >
              {busy ? 'Guardando…' : 'Guardar contraseña'}
            </button>
            {error && (
              <div className="rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk" role="alert">
                {error}
              </div>
            )}
          </form>
        )}

        {recovery.kind === 'complete' && (
          <Card className="rise rise-1 mt-7 flex flex-col items-center px-5 py-7 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-ok-soft">
              <Icon name="check" className="size-7 text-ok" />
            </span>
            <h2 className="mt-4 text-[18px] font-bold text-ink">Contraseña actualizada</h2>
            <p className="mt-2 max-w-[32ch] text-[14px] leading-relaxed text-dim">
              Tus sesiones anteriores quedaron cerradas. Ya puedes entrar con tu contraseña nueva.
            </p>
            <a
              href={`/${locale}/login`}
              className="btn-gradient mt-5 w-full rounded-2xl py-3.5 text-[16px] font-semibold text-white"
            >
              Iniciar sesión
            </a>
          </Card>
        )}
      </main>
    </PublicShell>
  );
}
