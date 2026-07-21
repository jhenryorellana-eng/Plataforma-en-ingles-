'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import type { RegisterGuardianResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import {
  MissionIntro,
  MissionShell,
  missionStyles,
} from '@/components/registration/mission-shell';

export default function RegisterGuardianPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVerification, setPendingVerification] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await clientApi<RegisterGuardianResponse>('/auth/register-guardian', {
        method: 'POST',
        body: JSON.stringify({ displayName, email, password }),
      });
      if (response.status === 'pendingVerification') setPendingVerification(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear tu cuenta');
      setBusy(false);
    }
  }

  if (pendingVerification) {
    return (
      <MissionShell locale={locale} step={3}>
        <main className={missionStyles.successCard}>
          <div className="mx-auto flex size-16 items-center justify-center rounded-[22px_22px_22px_8px] border border-[#ffd35a]/25 bg-[#ffd35a]/10 shadow-[0_6px_0_#040d18]">
            <span className="text-3xl" aria-hidden>
              ✦
            </span>
          </div>
          <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#ffd35a]">
            Señal enviada
          </p>
          <h1 className="mt-2 text-[clamp(2rem,4vw,2.8rem)] font-extrabold leading-none tracking-[-0.05em] text-white">
            Revisa tu correo
          </h1>
          <p className="mx-auto mt-4 max-w-[43ch] text-[13px] leading-relaxed text-[#9eb1c7]">
            Enviamos un enlace de verificación a <strong className="text-slate-100">{email}</strong>.
            Confirma tu correo y luego entra al control de misión para aceptar invitaciones.
          </p>
          <Link href={`/${locale}/login`} className={`${missionStyles.primaryButton} mt-7 no-underline`}>
            Ir a iniciar sesión <span aria-hidden>→</span>
          </Link>
        </main>
      </MissionShell>
    );
  }

  return (
    <MissionShell locale={locale} step={2}>
      <main>
        <Link href={`/${locale}/register`} className={missionStyles.backLink}>
          <span aria-hidden>←</span> Cambiar tipo de cuenta
        </Link>

        <MissionIntro
          image="/brand/registration/role-guardian.webp"
          imageAlt="Apoderado acompañando una ruta desde el control de misión"
          eyebrow="Control de misión familiar"
          title="Prepara tu acceso de apoderado"
          description="Tendrás visibilidad del progreso y control de permisos, respetando siempre el espacio del estudiante."
        />

        <form
          className={missionStyles.formCard}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className={missionStyles.formGrid}>
            <label className={`${missionStyles.field} ${missionStyles.fieldWide}`}>
              <span className={missionStyles.label}>Tu nombre</span>
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Nombre y apellido"
                className={missionStyles.input}
              />
            </label>

            <label className={`${missionStyles.field} ${missionStyles.fieldWide}`}>
              <span className={missionStyles.label}>Correo de acceso</span>
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                className={missionStyles.input}
              />
            </label>

            <label className={`${missionStyles.field} ${missionStyles.fieldWide}`}>
              <span className={missionStyles.label}>Crea una contraseña</span>
              <span className={missionStyles.passwordWrap}>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={missionStyles.input}
                />
                <button
                  type="button"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                  className={missionStyles.passwordToggle}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={busy || displayName.trim().length < 2 || !email.includes('@') || password.length < 8}
            className={missionStyles.primaryButton}
          >
            {busy ? 'Creando control de misión…' : 'Crear mi acceso y verificar correo'}
            {!busy && <span aria-hidden>→</span>}
          </button>
        </form>

        {error && (
          <div className={missionStyles.errorAlert} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <p className={missionStyles.formHint}>
          Nunca mostramos conversaciones completas. Solo verás progreso, permisos y señales necesarias
          para acompañar de forma segura.
        </p>
      </main>
    </MissionShell>
  );
}
