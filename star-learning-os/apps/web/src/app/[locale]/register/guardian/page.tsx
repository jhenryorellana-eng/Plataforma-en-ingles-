'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { AppIcon, Card } from '@/components/ui';

export default function RegisterGuardianPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await clientApi('/auth/register-guardian', {
        method: 'POST',
        body: JSON.stringify({ displayName, email, password }),
      });
      router.push(`/${locale}/family`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear tu cuenta');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="rise flex flex-col items-center text-center">
        <AppIcon className="size-14" />
        <h1 className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Tu cuenta de apoderado/a
        </h1>
        <p className="mt-1.5 max-w-[34ch] text-[14px] leading-relaxed text-dim">
          Desde tu portal autorizas el servicio, gestionas permisos por finalidad y ves el progreso
          — nunca las conversaciones completas.
        </p>
      </div>

      <Card className="rise rise-1 mt-7 flex flex-col gap-4 px-5 py-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-dim">Tu nombre</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Nombre y apellido"
            className="rounded-xl bg-mist px-4 py-3 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-dim">Tu correo</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tu@correo.com"
            className="rounded-xl bg-mist px-4 py-3 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-dim">Tu contraseña</span>
          <span className="relative block">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-xl bg-mist px-4 py-3 pr-20 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
      </Card>

      <button
        type="button"
        disabled={busy || displayName.trim().length < 2 || !email.includes('@') || password.length < 8}
        onClick={submit}
        className="rise rise-2 mt-5 w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
      >
        {busy ? 'Creando tu cuenta…' : 'Continuar'}
      </button>

      {error && (
        <div className="rise mt-4 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
    </main>
  );
}
