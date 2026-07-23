'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zRegisterGuardianResponse } from '@star/contracts';
import { clientApiValidated } from '@/lib/client-api';
import { MissionIntro, MissionShell, missionStyles } from '@/components/registration/mission-shell';

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adultGuardianAttestation, setAdultGuardianAttestation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await clientApiValidated(zRegisterGuardianResponse, '/auth/register-guardian', {
        method: 'POST',
        body: JSON.stringify({ displayName, email, password, adultGuardianAttestation }),
      });
      try {
        sessionStorage.setItem('star:guardian-registration-email', email.trim().toLowerCase());
      } catch {
        // El registro ya terminó; un storage bloqueado no debe provocar un reintento duplicado.
      }
      router.push(`/${locale}/register/check-email`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear tu cuenta');
    } finally {
      setBusy(false);
    }
  }

  const ready =
    displayName.trim().length >= 2 &&
    email.includes('@') &&
    password.length >= 8 &&
    adultGuardianAttestation;

  return (
    <MissionShell locale={locale} step={1}>
      <main>
        <MissionIntro
          image="/brand/registration/role-guardian.webp"
          imageAlt="Una familia preparando una ruta de aprendizaje"
          eyebrow="Paso 1 · tu acceso de adulto"
          title="Primero, crea tu acceso."
          description="Verificarás tu correo y después crearás una cuenta separada para tu hijo/a, sin pedirle un correo personal."
        />

        <form className={missionStyles.formCard} onSubmit={submit} aria-busy={busy}>
          <div className={missionStyles.formGrid}>
            <label className={`${missionStyles.field} ${missionStyles.fieldWide}`}>
              <span className={missionStyles.label}>Tu nombre</span>
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={60}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Nombre y apellido"
                className={missionStyles.input}
              />
            </label>

            <label className={`${missionStyles.field} ${missionStyles.fieldWide}`}>
              <span className={missionStyles.label}>Tu correo</span>
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
                  maxLength={72}
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

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-[13px] leading-relaxed text-slate-200">
            <input
              type="checkbox"
              required
              checked={adultGuardianAttestation}
              onChange={(event) => setAdultGuardianAttestation(event.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-cyan-400"
            />
            <span>
              Confirmo que soy mayor de edad y madre, padre o apoderado autorizado del menor.
            </span>
          </label>

          <button type="submit" disabled={busy || !ready} className={missionStyles.primaryButton}>
            {busy ? 'Creando tu acceso…' : 'Continuar'}
            {!busy && <span aria-hidden>→</span>}
          </button>
        </form>

        {error && (
          <div className={missionStyles.errorAlert} role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <section className="mt-5 space-y-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.055] p-4 text-[13px] leading-relaxed text-slate-300">
          <p>
            <strong className="text-white">Dos cuentas, dos contraseñas.</strong> Tu hijo/a tendrá
            su propio acceso. Tú administrarás permisos, recuperación y progreso.
          </p>
          <p>
            La publicidad está dirigida a adultos. No usamos los datos ni la actividad del menor
            para anuncios.
          </p>
          <p className="text-slate-400">
            Este paso solo crea tu acceso de adulto. Antes de crear la cuenta del menor verás el
            aviso de privacidad versionado y elegirás cada permiso; nada se activa con este botón.
          </p>
        </section>

        <p className="mt-6 text-center text-[13px] text-[#8198b1]">
          ¿Ya tienes una cuenta?{' '}
          <Link
            href={`/${locale}/login`}
            className="font-extrabold text-[#8fa5ff] underline-offset-4 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </main>
    </MissionShell>
  );
}
