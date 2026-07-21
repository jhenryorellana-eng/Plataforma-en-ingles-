'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { ClientApiError, clientApi } from '@/lib/client-api';
import {
  MissionIntro,
  MissionShell,
  missionStyles,
} from '@/components/registration/mission-shell';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 45 }, (_, index) => CURRENT_YEAR - 12 - index);

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
    if (busy) return;
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
    <MissionShell locale={locale} step={2}>
      <main>
        <Link href={`/${locale}/register`} className={missionStyles.backLink}>
          <span aria-hidden>←</span> Cambiar tipo de cuenta
        </Link>

        <MissionIntro
          image="/brand/registration/role-learner.webp"
          imageAlt="Estudiante exploradora junto a Nova"
          eyebrow="Ruta de estudiante"
          title="Crea tu perfil de misión"
          description="Con estos datos preparamos una experiencia segura y calculamos el punto correcto para empezar."
        />

        <form
          className={missionStyles.formCard}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className={missionStyles.formGrid}>
            <label className={missionStyles.field}>
              <span className={missionStyles.label}>¿Cómo te llamamos?</span>
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Tu nombre"
                className={missionStyles.input}
              />
            </label>

            <label className={missionStyles.field}>
              <span className={missionStyles.label}>Año de nacimiento</span>
              <select
                name="bday-year"
                autoComplete="bday-year"
                required
                value={birthYear}
                onChange={(event) => setBirthYear(Number(event.target.value))}
                className={missionStyles.select}
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className={`${missionStyles.field} ${missionStyles.fieldWide}`}>
              <span className={missionStyles.label}>Tu correo de acceso</span>
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
            {busy ? 'Preparando tu perfil…' : 'Crear mi perfil y continuar'}
            {!busy && <span aria-hidden>→</span>}
          </button>
        </form>

        {error && (
          <div className={missionStyles.errorAlert} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <p className={missionStyles.formHint}>
          Tu edad define las protecciones de la experiencia. Si eres menor, el siguiente paso será
          invitar a tu apoderado. Usa un correo real para poder recuperar tu acceso.
        </p>
      </main>
    </MissionShell>
  );
}
