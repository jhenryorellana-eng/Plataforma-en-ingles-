'use client';

import { use, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zMeResponse, type MeResponse } from '@star/contracts';
import { clientApi, clientApiValidated } from '@/lib/client-api';
import { Icon, InitialsAvatar } from '@/components/ui';
import { NeonLogo } from '@/components/neon-logo';
import { SpaceBackground } from '@/components/space-background';
import { urlWithoutSupabaseAuthFragment } from '@/lib/supabase-auth-fragment';

const PROFILES = [
  { profile: 'learner_teen', name: 'Diego Torres', detail: 'Alumno 14–17 · todo autorizado' },
  { profile: 'learner_young', name: 'Lucía Torres', detail: 'Alumna 12–13 · voz sujeta a ZDR' },
  { profile: 'guardian', name: 'Ana Torres', detail: 'Apoderada' },
  { profile: 'staff', name: 'Prof. Rivas', detail: 'Equipo académico' },
] as const;

const SHOW_DEMO = process.env.NEXT_PUBLIC_DEMO_LOGIN === 'true';

const GLASS_CARD =
  'rounded-3xl border border-white/12 bg-white/[0.06] shadow-[0_24px_70px_rgba(2,6,23,0.6)] backdrop-blur-2xl';

function routeFor(nextAction: MeResponse['nextAction'], locale: string): string {
  switch (nextAction) {
    case 'guardian_family':
      return `/${locale}/family`;
    case 'change_password':
      return `/${locale}/onboarding/access`;
    case 'youth_assent':
      return `/${locale}/onboarding/assent`;
    case 'staff_home':
      return `/${locale}/staff`;
    case 'learner_home':
      return `/${locale}/learn`;
  }
}

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'forgot' | 'forgot-sent'>('login');
  const [identifier, setIdentifier] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warping, setWarping] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const cleanUrl = urlWithoutSupabaseAuthFragment(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    );
    if (cleanUrl) window.history.replaceState(window.history.state, '', cleanUrl);
  }, []);

  /* Parallax sutil: solo puntero fino y sin reduce-motion; todo vía GPU. */
  useEffect(() => {
    const element = mainRef.current;
    if (!element) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        element.style.setProperty('--px', ((event.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        element.style.setProperty(
          '--py',
          ((event.clientY / window.innerHeight) * 2 - 1).toFixed(3),
        );
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  /** Entrada cinematográfica: hyperspace antes de navegar (si el usuario lo permite). */
  function navigateWithWarp(href: string) {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      router.push(href);
      return;
    }
    setWarping(true);
    window.setTimeout(() => router.push(href), 620);
  }

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await clientApiValidated(zMeResponse, '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      navigateWithWarp(routeFor(me.nextAction, locale));
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
        body: JSON.stringify({ email: recoveryEmail }),
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
      const me = await clientApiValidated(zMeResponse, '/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ profile }),
      });
      navigateWithWarp(routeFor(me.nextAction, locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
      setDemoLoading(null);
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-[16px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#2fe6ff]/50';

  return (
    <main
      ref={mainRef}
      className="relative min-h-dvh overflow-hidden"
      style={{ colorScheme: 'dark', backgroundColor: '#050816' }}
    >
      <div className="parallax-sky">
        <SpaceBackground />
      </div>
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col items-center justify-center gap-8 px-5 py-10 lg:grid lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-12">
        <section className="parallax-hero rise flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className={`lg:hidden ${warping ? 'warp-rocket' : ''}`}>
            <NeonLogo
              withWordmark={false}
              className="w-44 drop-shadow-[0_18px_50px_rgba(124,58,237,0.35)] sm:w-52"
            />
          </div>
          <div className={`hidden lg:block ${warping ? 'warp-rocket' : ''}`}>
            <NeonLogo className="w-[21rem] drop-shadow-[0_18px_50px_rgba(124,58,237,0.35)]" />
          </div>
          <h1 className="neon-word anim-neon-hum mt-3 text-[32px] font-extrabold tracking-tight lg:sr-only">
            StarbizAcademy
          </h1>
          <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-white/65 lg:text-[17px]">
            Tu ruta medible desde tu nivel real hasta tu meta en inglés.
          </p>
          <div className="mt-6 hidden items-center gap-3.5 text-[12.5px] font-medium text-white/45 lg:flex">
            <span>StarMap diagnóstico</span>
            <span className="text-white/25">·</span>
            <span>Mentor por voz</span>
            <span className="text-white/25">·</span>
            <span>Revisión humana</span>
          </div>
        </section>

        <section className="rise rise-2 w-full max-w-md">
          {mode === 'login' && (
            <form onSubmit={submitLogin} className="flex flex-col gap-3">
              <div className={`${GLASS_CARD} flex flex-col gap-3.5 px-5 py-5`}>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-white/60">Correo o usuario</span>
                  <input
                    type="text"
                    name="identifier"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="tu@correo.com o nombre.usuario"
                    className={inputClass}
                  />
                  <span className="text-[11px] leading-relaxed text-white/40">
                    Los adultos entran con su correo. Los estudiantes usan el nombre de acceso que
                    les entregó su apoderado.
                  </span>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-white/60">Contraseña</span>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#7df0ff]"
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </span>
                </label>
              </div>
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
                  if (identifier.includes('@')) setRecoveryEmail(identifier);
                  setError(null);
                }}
                className="text-[14px] font-semibold text-[#7df0ff]"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={submitForgot} className="flex flex-col gap-3">
              <div className={`${GLASS_CARD} flex flex-col gap-3 px-5 py-5`}>
                <p className="text-[15px] font-semibold text-white">Recuperar contraseña</p>
                <p className="text-[13px] leading-snug text-white/55">
                  Te enviaremos un enlace a tu correo para crear una contraseña nueva.
                </p>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={recoveryEmail}
                  onChange={(event) => setRecoveryEmail(event.target.value)}
                  placeholder="tu@correo.com"
                  className={inputClass}
                />
              </div>
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
                className="text-[14px] font-semibold text-[#7df0ff]"
              >
                Volver a iniciar sesión
              </button>
            </form>
          )}

          {mode === 'forgot-sent' && (
            <div className={`${GLASS_CARD} flex flex-col items-center gap-3 px-5 py-7 text-center`}>
              <span className="flex size-14 items-center justify-center rounded-full bg-ok-soft">
                <Icon name="check" className="size-7 text-ok" />
              </span>
              <p className="text-[17px] font-bold text-white">Revisa tu correo</p>
              <p className="max-w-[32ch] text-[14px] leading-relaxed text-white/55">
                Si {recoveryEmail} tiene una cuenta, recibirá un enlace para crear una contraseña
                nueva. Si eres estudiante, tu apoderado puede regenerar tu acceso desde el panel
                familiar.
              </p>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[14px] font-semibold text-[#7df0ff]"
              >
                Volver a iniciar sesión
              </button>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-5">
            <a href={`/${locale}/register`} className="text-[14px] font-semibold text-[#7df0ff]">
              Crear cuenta familiar
            </a>
            <span className="text-white/20">·</span>
            <a href={`/${locale}/preview`} className="text-[14px] font-semibold text-[#7df0ff]">
              Probar StarMap Preview
            </a>
          </div>

          {SHOW_DEMO && (
            <div className="mt-8">
              <p className="px-1 pb-2 text-[13px] font-medium uppercase tracking-wide text-white/45">
                Acceso demo (solo desarrollo)
              </p>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-xl [&>*+*]:border-t [&>*+*]:border-white/10">
                {PROFILES.map((item) => (
                  <button
                    key={item.profile}
                    type="button"
                    disabled={demoLoading !== null}
                    onClick={() => demoLogin(item.profile)}
                    className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-white/10 active:bg-white/15 disabled:opacity-60"
                  >
                    <InitialsAvatar name={item.name} className="size-10" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-semibold text-white">
                        {item.name}
                      </span>
                      <span className="block text-[13px] text-white/50">{item.detail}</span>
                    </span>
                    {demoLoading === item.profile ? (
                      <span className="text-[13px] text-white/50">Entrando…</span>
                    ) : (
                      <Icon name="chevron" className="size-4 text-white/30" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
              {error}
            </div>
          )}
        </section>
      </div>

      {warping && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                'repeating-conic-gradient(from 0deg at 50% 46%, transparent 0deg 5deg, rgba(190,240,255,0.28) 5.5deg 6.5deg, transparent 7deg 12deg)',
              WebkitMaskImage: 'radial-gradient(circle at 50% 46%, transparent 8%, black 42%)',
              maskImage: 'radial-gradient(circle at 50% 46%, transparent 8%, black 42%)',
              animation: 'warp-streaks 0.65s ease-in forwards',
            }}
          />
          <div
            className="absolute inset-0 bg-white"
            style={{ animation: 'warp-flash 0.65s ease-in forwards' }}
          />
        </div>
      )}
    </main>
  );
}
