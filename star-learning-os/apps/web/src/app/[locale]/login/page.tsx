'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { AppIcon, Card, Group, Icon, InitialsAvatar, SectionHeader } from '@/components/ui';

const PROFILES = [
  { profile: 'learner_teen', name: 'Diego Torres', detail: 'Alumno 14–17 · todo autorizado' },
  { profile: 'learner_young', name: 'Lucía Torres', detail: 'Alumna 12–13 · voz sujeta a ZDR' },
  { profile: 'guardian', name: 'Ana Torres', detail: 'Apoderada' },
  { profile: 'staff', name: 'Prof. Rivas', detail: 'Equipo académico' },
] as const;

const SHOW_DEMO = process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true';

function routeFor(role: MeResponse['role'], locale: string): string {
  if (role === 'guardian') return `/${locale}/family`;
  if (role === 'staff') return `/${locale}/staff`;
  return `/${locale}/learn`;
}

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'forgot' | 'forgot-sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await clientApi<MeResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.push(routeFor(me.role, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
      setBusy(false);
    }
  }

  async function submitForgot(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await clientApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setMode('forgot-sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo');
    } finally {
      setBusy(false);
    }
  }

  async function demoLogin(profile: (typeof PROFILES)[number]['profile']) {
    setDemoLoading(profile);
    setError(null);
    try {
      const me = await clientApi<MeResponse>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ profile }),
      });
      router.push(routeFor(me.role, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
      setDemoLoading(null);
    }
  }

  const inputClass =
    'w-full rounded-2xl bg-mist px-4 py-3.5 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50';

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="rise flex flex-col items-center text-center">
        <span className="relative inline-flex items-center justify-center">
          <span className="halo-ring absolute -inset-4 rounded-full" aria-hidden />
          <AppIcon className="icon-glow size-20" />
        </span>
        <h1 className="mt-7 text-[34px] font-extrabold leading-tight tracking-tight text-ink">
          Starbiz<span className="text-gradient">Academy</span>
        </h1>
        <p className="mt-2 max-w-[30ch] text-[16px] leading-relaxed text-dim">
          Tu ruta medible desde tu nivel real hasta tu meta en inglés.
        </p>
      </div>

      {mode === 'login' && (
        <form onSubmit={submitLogin} className="rise rise-2 mt-10 flex flex-col gap-3">
          <Card className="flex flex-col gap-3 px-5 py-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-dim">Correo</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-dim">Contraseña</span>
              <span className="relative block">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contraseña"
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
          </Card>
          <button
            type="submit"
            disabled={busy}
            className="btn-gradient w-full rounded-2xl py-3.5 text-[17px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Entrando…' : 'Iniciar sesión'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('forgot');
              setError(null);
            }}
            className="text-[14px] font-semibold text-primary"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      )}

      {mode === 'forgot' && (
        <form onSubmit={submitForgot} className="rise mt-10 flex flex-col gap-3">
          <Card className="flex flex-col gap-3 px-5 py-5">
            <p className="text-[15px] font-semibold text-ink">Recuperar contraseña</p>
            <p className="text-[13px] leading-snug text-dim">
              Te enviaremos un enlace a tu correo para crear una contraseña nueva.
            </p>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@correo.com"
              className={inputClass}
            />
          </Card>
          <button
            type="submit"
            disabled={busy}
            className="btn-gradient w-full rounded-2xl py-3.5 text-[17px] font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Enviando…' : 'Enviar enlace'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className="text-[14px] font-semibold text-primary"
          >
            Volver a iniciar sesión
          </button>
        </form>
      )}

      {mode === 'forgot-sent' && (
        <Card className="rise mt-10 flex flex-col items-center gap-3 px-5 py-7 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-ok-soft">
            <Icon name="check" className="size-7 text-ok" />
          </span>
          <p className="text-[17px] font-bold text-ink">Revisa tu correo</p>
          <p className="max-w-[32ch] text-[14px] leading-relaxed text-dim">
            Si {email} tiene una cuenta, recibirá un enlace para crear una contraseña nueva.
          </p>
          <button
            type="button"
            onClick={() => setMode('login')}
            className="text-[14px] font-semibold text-primary"
          >
            Volver a iniciar sesión
          </button>
        </Card>
      )}

      <div className="rise rise-3 mt-6 flex items-center justify-center gap-5">
        <a href={`/${locale}/register`} className="text-[14px] font-semibold text-primary">
          Crear cuenta
        </a>
        <span className="text-line">·</span>
        <a href={`/${locale}/preview`} className="text-[14px] font-semibold text-primary">
          Probar StarMap Preview
        </a>
      </div>

      {SHOW_DEMO && (
        <div className="rise rise-3 mt-10">
          <SectionHeader>Acceso demo (solo desarrollo)</SectionHeader>
          <Group>
            {PROFILES.map((item) => (
              <button
                key={item.profile}
                type="button"
                disabled={demoLoading !== null}
                onClick={() => demoLogin(item.profile)}
                className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-all hover:bg-primary-soft/50 active:bg-mist disabled:opacity-60"
              >
                <InitialsAvatar name={item.name} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-ink">{item.name}</span>
                  <span className="block text-[13px] text-dim">{item.detail}</span>
                </span>
                {demoLoading === item.profile ? (
                  <span className="text-[13px] text-dim">Entrando…</span>
                ) : (
                  <Icon name="chevron" className="size-4 text-[#c7c7cc]" />
                )}
              </button>
            ))}
          </Group>
        </div>
      )}

      {error && (
        <div className="rise mt-4 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
    </main>
  );
}
