'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { zResendConfirmationResponse } from '@star/contracts';
import { clientApiValidated } from '@/lib/client-api';
import { MissionShell, missionStyles } from '@/components/registration/mission-shell';

export default function CheckEmailPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setEmail(sessionStorage.getItem('star:guardian-registration-email') ?? '');
    } catch {
      setEmail('');
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function resend() {
    if (!email || busy || cooldown > 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await clientApiValidated(zResendConfirmationResponse, '/auth/resend-confirmation', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMessage('Si el registro sigue pendiente, enviamos un enlace nuevo.');
      setCooldown(60);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo reenviar el correo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <MissionShell locale={locale} step={1}>
      <main className={missionStyles.successCard}>
        <div
          className="mx-auto flex size-16 items-center justify-center rounded-[22px_22px_22px_8px] border border-[#ffd35a]/25 bg-[#ffd35a]/10 text-3xl shadow-[0_6px_0_#040d18]"
          aria-hidden
        >
          ✦
        </div>
        <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#ffd35a]">
          Protegemos el acceso adulto
        </p>
        <h1 className="mt-2 text-[clamp(2rem,4vw,2.8rem)] font-extrabold leading-none tracking-[-0.05em] text-white">
          Confirma tu correo
        </h1>
        <p className="mx-auto mt-4 max-w-[48ch] text-[13px] leading-relaxed text-[#b4c4d6]">
          {email ? (
            <>
              Enviamos un enlace a <strong className="text-white">{email}</strong>. Necesitamos
              comprobar que controlas esa dirección antes de crear la cuenta del menor.
            </>
          ) : (
            <>Abre el enlace que enviamos a tu correo antes de continuar.</>
          )}
        </p>

        <div className="mx-auto mt-5 max-w-[48ch] rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left text-[13px] leading-relaxed text-slate-300">
          Confirmar el correo no demuestra por sí solo tu identidad ni el vínculo con el menor.
          Algunas funciones pueden requerir una verificación adicional. Revisa también Spam o
          Promociones.
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!email || busy || cooldown > 0}
            onClick={() => void resend()}
            className={missionStyles.primaryButton}
          >
            {busy ? 'Reenviando…' : cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar correo'}
          </button>
          <Link
            href={`/${locale}/login?verified=1`}
            className={`${missionStyles.primaryButton} no-underline`}
          >
            Ya confirmé mi correo
          </Link>
        </div>

        {message && (
          <p className="mt-4 text-[13px] text-emerald-300" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 text-[13px] text-rose-300" role="alert">
            {error}
          </p>
        )}

        <Link
          href={`/${locale}/register`}
          className={`${missionStyles.backLink} mt-6 justify-center`}
        >
          ← Cambiar correo
        </Link>
      </main>
    </MissionShell>
  );
}
