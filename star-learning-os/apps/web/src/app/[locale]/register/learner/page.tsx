'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { ClientApiError, clientApi } from '@/lib/client-api';
import { AppIcon, Card } from '@/components/ui';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 45 }, (_, i) => CURRENT_YEAR - 12 - i);

export default function RegisterLearnerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthYear, setBirthYear] = useState<number>(CURRENT_YEAR - 14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const me = await clientApi<MeResponse>('/auth/register-learner', {
        method: 'POST',
        body: JSON.stringify({ displayName, email, password, birthYear }),
      });
      if (me.ageBand === 'a18_plus') {
        router.push(`/${locale}/enroll`);
      } else {
        router.push(`/${locale}/onboarding/guardian`);
      }
    } catch (err) {
      if (err instanceof ClientApiError && err.code === 'AGE_NOT_ALLOWED') {
        setError('StarbizAcademy está diseñada para estudiantes desde los 12 años.');
      } else {
        setError(err instanceof Error ? err.message : 'No se pudo crear tu cuenta');
      }
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="rise flex flex-col items-center text-center">
        <AppIcon className="size-14" />
        <h1 className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          Tu cuenta de estudiante
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-dim">
          Tu edad define tu experiencia y tus protecciones — por eso la pedimos primero.
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
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-dim">Año de nacimiento</span>
          <select
            value={birthYear}
            onChange={(event) => setBirthYear(Number(event.target.value))}
            className="rounded-xl bg-mist px-4 py-3 text-[16px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
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

      <p className="mt-5 px-5 text-center text-[12px] leading-relaxed text-dim">
        Entras de inmediato, sin esperar correos de confirmación. Usa un correo real: es tu única
        vía para recuperar la contraseña.
      </p>
    </main>
  );
}
