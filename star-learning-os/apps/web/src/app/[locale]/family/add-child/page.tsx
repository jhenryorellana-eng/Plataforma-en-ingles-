'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONSENT_NOTICE_VERSION, zCreateManagedLearnerResponse } from '@star/contracts';
import { clientApi, clientApiValidated } from '@/lib/client-api';
import { AuroraHero, AuroraSurface } from '@/components/aurora/aurora-hero';
import { Icon, Wordmark } from '@/components/ui';

interface OneTimeCredentials {
  displayName: string;
  loginName: string;
  password: string;
}

const inputClass =
  'mt-2 min-h-12 w-full rounded-xl border border-line bg-mist px-4 py-3 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/45';

export default function AddChildPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [displayName, setDisplayName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [loginName, setLoginName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [legalGuardianAttestation, setLegalGuardianAttestation] = useState(false);
  const [service, setService] = useState(false);
  const [storage, setStorage] = useState(false);
  const [aiVoice, setAiVoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [credentials, setCredentials] = useState<OneTimeCredentials | null>(null);

  const parsedBirthYear = Number(birthYear);
  const birthYearIsValid =
    Number.isInteger(parsedBirthYear) &&
    parsedBirthYear >= currentYear - 18 &&
    parsedBirthYear <= currentYear - 13;
  const loginNameIsValid =
    loginName.length >= 4 &&
    loginName.length <= 30 &&
    /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(loginName);
  const passwordMatches = password.length >= 8 && password === passwordConfirmation;
  const canSubmit =
    displayName.trim().length >= 2 &&
    birthYearIsValid &&
    loginNameIsValid &&
    passwordMatches &&
    legalGuardianAttestation &&
    service &&
    storage &&
    !busy;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const submittedCredentials = {
      displayName: displayName.trim(),
      loginName,
      password,
    };
    try {
      const result = await clientApiValidated(zCreateManagedLearnerResponse, '/guardian/learners', {
        method: 'POST',
        body: JSON.stringify({
          displayName: submittedCredentials.displayName,
          loginName,
          password,
          birthYear: parsedBirthYear,
          legalGuardianAttestation: true,
          consentNoticeVersion: CONSENT_NOTICE_VERSION,
          consents: {
            service: true,
            storage: true,
            ai_voice: aiVoice,
            international_transfer: aiVoice,
          },
        }),
      });
      setCredentials({
        ...submittedCredentials,
        displayName: result.learner.displayName,
        loginName: result.learner.loginName,
      });
      setPassword('');
      setPasswordConfirmation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear el acceso del estudiante');
    } finally {
      setBusy(false);
    }
  }

  async function copyCredentials() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(
        `Acceso StarbizAcademy para ${credentials.displayName}\nUsuario: ${credentials.loginName}\nContraseña temporal: ${credentials.password}`,
      );
      setCopyMessage('Accesos copiados. Compártelos de forma privada.');
    } catch {
      setCopyMessage(
        'No pudimos copiar automáticamente. Selecciona los datos y cópialos manualmente.',
      );
    }
  }

  /** Traspaso en el mismo dispositivo: cierra la sesión del apoderado y deja
   *  el login listo con el usuario del estudiante (la contraseña temporal
   *  jamás viaja en la URL; el estudiante la escribe él mismo). */
  async function handDeviceToStudent() {
    if (!credentials || handoffBusy) return;
    setHandoffBusy(true);
    try {
      await clientApi('/auth/logout', { method: 'POST' });
    } catch {
      // La cookie local queda inválida igualmente; el login la reemplaza.
    } finally {
      router.replace(`/${locale}/login?student=${encodeURIComponent(credentials.loginName)}`);
    }
  }

  if (credentials) {
    return (
      <div className="mission-shell min-h-dvh overflow-x-clip">
        <header className="material-bar border-b border-line/80">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
            <Wordmark />
            <span className="rounded-full bg-ok-soft px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-ok-deep">
              Cuenta creada
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-14 pt-7 sm:px-6 sm:pt-10">
          <AuroraSurface className="rise overflow-hidden" tone="gold">
            <div className="border-b border-line px-5 py-6 text-center sm:px-8">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-ok-soft">
                <Icon name="check" className="size-7 text-ok-deep" />
              </span>
              <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gold-deep">
                Guarda estos datos ahora
              </p>
              <h1 className="mt-2 text-[clamp(1.8rem,6vw,2.8rem)] font-extrabold leading-none tracking-[-0.04em] text-ink">
                El acceso de {credentials.displayName} está listo
              </h1>
              <p className="mx-auto mt-3 max-w-[52ch] text-[13px] leading-relaxed text-dim">
                Por seguridad, la plataforma no volverá a mostrar la contraseña temporal. El
                estudiante tendrá que cambiarla al entrar por primera vez.
              </p>
            </div>

            <dl className="grid gap-3 px-5 pt-5 sm:grid-cols-2 sm:px-8 sm:pt-7">
              <div className="rounded-2xl border border-line bg-mist px-4 py-3.5">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-dim">
                  Usuario
                </dt>
                <dd className="mt-1 select-all break-all font-mono text-[17px] font-extrabold text-ink">
                  {credentials.loginName}
                </dd>
              </div>
              <div className="rounded-2xl border border-line bg-mist px-4 py-3.5">
                <dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-dim">
                  Contraseña temporal
                </dt>
                <dd className="mt-1 select-all break-all font-mono text-[17px] font-extrabold text-ink">
                  {credentials.password}
                </dd>
              </div>
            </dl>

            {/* Quién sigue y qué le espera: el siguiente turno es SIEMPRE del estudiante. */}
            <div className="px-5 py-5 sm:px-8 sm:py-6">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-teal">
                Qué sigue para {credentials.displayName}
              </p>
              <ol className="mt-2.5 space-y-2">
                {[
                  'Entra con este usuario y la contraseña temporal (tú no vuelves a usar su cuenta).',
                  'Crea su contraseña privada: tú dejarás de conocerla, por diseño.',
                  'Da su propio asentimiento y comienza su diagnóstico StarMap.',
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-extrabold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-[12.5px] leading-relaxed text-dim">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[11px] leading-relaxed text-dim">
                Si olvida su contraseña, tú generas una temporal nueva desde tu panel con
                «Regenerar acceso».
              </p>
            </div>

            <div className="border-t border-line px-5 py-5 sm:px-8">
              <button
                type="button"
                onClick={() => void copyCredentials()}
                className="tactile-button min-h-12 w-full rounded-xl px-5 text-[14px] font-extrabold text-white"
              >
                Copiar accesos
              </button>
              {copyMessage && (
                <p
                  className="mt-3 text-center text-[11.5px] leading-relaxed text-dim"
                  role="status"
                >
                  {copyMessage}
                </p>
              )}

              <div className="mt-5 rounded-2xl border border-primary/25 bg-primary-soft/40 p-4">
                <p className="text-[13px] font-extrabold text-ink">
                  ¿{credentials.displayName} estudiará en este mismo dispositivo?
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
                  Cerramos tu sesión de apoderado y dejamos el inicio de sesión listo con su
                  usuario. Solo tendrá que escribir la contraseña temporal.
                </p>
                <button
                  type="button"
                  disabled={handoffBusy}
                  onClick={() => void handDeviceToStudent()}
                  className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/35 bg-surface px-5 text-[14px] font-extrabold text-primary transition hover:bg-primary-soft disabled:opacity-60"
                >
                  <Icon name="logout" className="size-4" />
                  {handoffBusy ? 'Cerrando tu sesión…' : 'Entregarle el dispositivo ahora'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => router.replace(`/${locale}/family`)}
                className="mt-3 min-h-12 w-full rounded-xl border border-line bg-surface px-5 text-[14px] font-extrabold text-ink hover:bg-mist"
              >
                Ya guardé los accesos · volver a mi panel
              </button>
            </div>
          </AuroraSurface>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-dim">
            No envíes estos datos en grupos públicos. Cierra esta pantalla si alguien más puede ver
            tu dispositivo.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="mission-shell min-h-dvh overflow-x-clip">
      <header className="material-bar border-b border-line/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Wordmark />
          <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">
            Cuenta del estudiante
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3.5 pb-16 pt-4 sm:px-6 sm:pt-7">
        <Link
          href={`/${locale}/family`}
          className="mb-4 inline-flex min-h-10 items-center gap-2 text-[13px] font-bold text-primary"
        >
          <span aria-hidden>←</span> Volver al panel familiar
        </Link>
        <AuroraHero
          asset="family"
          eyebrow="Tú creas y acompañas su acceso"
          title="Crea la cuenta de tu hijo o hija."
          body="No pediremos su correo. Tú eliges un usuario y una contraseña temporal; después, el estudiante crea su contraseña privada y decide su propio asentimiento."
          tone="gold"
          priority
          imageAlt="Familia preparando el acceso de un estudiante"
          compact
        />

        <form
          onSubmit={submit}
          className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.92fr] lg:items-start"
        >
          <div className="space-y-5">
            <AuroraSurface className="overflow-hidden" tone="neutral">
              <div className="border-b border-line px-5 py-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">
                  1. Datos mínimos
                </p>
                <h2 className="mt-1 text-[19px] font-extrabold text-ink">Sobre el estudiante</h2>
              </div>
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-[12px] font-bold text-ink">Nombre o apodo</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="off"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder="Como quiere que lo llamemos"
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className="text-[12px] font-bold text-ink">Año de nacimiento</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={birthYear}
                    onChange={(event) => setBirthYear(event.target.value)}
                    min={currentYear - 18}
                    max={currentYear - 13}
                    required
                    placeholder={`${currentYear - 14}`}
                    className={inputClass}
                    aria-describedby="birth-year-help"
                  />
                  <span
                    id="birth-year-help"
                    className="mt-1.5 block text-[12px] leading-relaxed text-dim"
                  >
                    Solo lo usamos para aplicar protecciones por edad. La plataforma está disponible
                    desde los 12 años y esta ruta es para menores de 18.
                  </span>
                </label>
                <label>
                  <span className="text-[12px] font-bold text-ink">Usuario de acceso</span>
                  <input
                    value={loginName}
                    onChange={(event) =>
                      setLoginName(event.target.value.toLowerCase().replace(/\s+/g, ''))
                    }
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    minLength={4}
                    maxLength={30}
                    pattern="[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*"
                    placeholder="luna.estrella"
                    className={inputClass}
                    aria-describedby="login-name-help"
                  />
                  <span
                    id="login-name-help"
                    className="mt-1.5 block text-[12px] leading-relaxed text-dim"
                  >
                    Entre 4 y 30 caracteres. Empieza con una letra; usa minúsculas, números y
                    separadores sin repetirlos ni dejarlos al final.
                  </span>
                </label>
              </div>
            </AuroraSurface>

            <AuroraSurface className="overflow-hidden" tone="blue">
              <div className="border-b border-line px-5 py-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-teal">
                  2. Acceso temporal
                </p>
                <h2 className="mt-1 text-[19px] font-extrabold text-ink">
                  Una contraseña para el primer ingreso
                </h2>
              </div>
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
                <label>
                  <span className="text-[12px] font-bold text-ink">Contraseña temporal</span>
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
                  <span className="text-[12px] font-bold text-ink">Repite la contraseña</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordConfirmation}
                    onChange={(event) => setPasswordConfirmation(event.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    aria-invalid={passwordConfirmation.length > 0 && !passwordMatches}
                    className={inputClass}
                  />
                </label>
                <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[12px] leading-relaxed text-dim">
                    Mínimo 8 caracteres. El estudiante deberá reemplazarla al entrar.
                  </p>
                  <button
                    type="button"
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                    className="min-h-10 rounded-xl border border-line bg-surface px-3 text-[12px] font-bold text-primary"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'} contraseñas
                  </button>
                </div>
              </div>
            </AuroraSurface>
          </div>

          <AuroraSurface className="overflow-hidden lg:sticky lg:top-5" tone="gold">
            <div className="border-b border-line px-5 py-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-gold-deep">
                3. Tu decisión como responsable
              </p>
              <h2 className="mt-1 text-[19px] font-extrabold text-ink">
                Permisos claros, uno por uno
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-dim">
                Nada está marcado por defecto. Servicio y almacenamiento son necesarios para crear
                la cuenta. La voz con IA es opcional.
              </p>
            </div>

            <PrivacyNotice />

            <fieldset className="divide-y divide-line">
              <legend className="sr-only">Permisos y declaración del apoderado</legend>
              <ConsentChoice
                checked={service}
                onChange={setService}
                name="service"
                title="Servicio educativo"
                detail="Permite usar la plataforma, realizar actividades y recibir seguimiento de progreso. Es necesario."
                required
              />
              <ConsentChoice
                checked={storage}
                onChange={setStorage}
                name="storage"
                title="Guardar evidencia de aprendizaje"
                detail="Conservamos resultados y progreso; no guardamos el audio de práctica. Es necesario."
                required
              />
              <ConsentChoice
                checked={aiVoice}
                onChange={setAiVoice}
                name="ai_voice"
                title="Voz con IA y procesamiento internacional"
                detail="Permite conversar con Nova, que siempre se identifica como IA. Para responder, proveedores contratados pueden procesar la voz fuera de Perú. No guardamos el audio. Opcional."
              />
              <ConsentChoice
                checked={legalGuardianAttestation}
                onChange={setLegalGuardianAttestation}
                name="legal_guardian_attestation"
                title="Declaro que soy su representante y leí el aviso"
                detail={`Confirmo que soy padre, madre o tutor legal autorizado, que leí el Aviso de privacidad para menores ${CONSENT_NOTICE_VERSION} y que puedo otorgar estos permisos.`}
                required
              />
            </fieldset>

            <div className="px-5 py-5">
              <button
                type="submit"
                disabled={!canSubmit}
                className="tactile-button min-h-14 w-full rounded-2xl px-5 text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
              >
                {busy ? 'Creando su acceso…' : 'Crear cuenta del estudiante'}
              </button>
              <p className="mt-3 text-center text-[13px] leading-relaxed text-dim">
                El asentimiento no se decide aquí: el estudiante lo verá y elegirá personalmente
                después de cambiar su contraseña.
              </p>
              {error && (
                <p
                  className="mt-3 rounded-xl bg-risk-soft px-3 py-2.5 text-[12px] font-medium leading-relaxed text-risk"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </p>
              )}
            </div>
          </AuroraSurface>
        </form>
      </main>
    </div>
  );
}

function PrivacyNotice() {
  return (
    <details className="border-b border-line bg-primary-soft/35 px-5 py-4">
      <summary className="cursor-pointer text-[13px] font-extrabold text-primary">
        Leer el aviso de privacidad · versión {CONSENT_NOTICE_VERSION}
      </summary>
      <div className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-dim">
        <p>
          <strong className="text-ink">Datos y finalidad.</strong> Recogemos nombre o apodo, año de
          nacimiento, usuario, respuestas, resultados, progreso y datos técnicos de seguridad para
          crear y proteger la cuenta, prestar el servicio educativo y atender riesgos. No pedimos
          correo al menor.
        </p>
        <p>
          <strong className="text-ink">Conservación.</strong> Guardamos la cuenta y la evidencia
          educativa mientras el servicio esté activo y después solo durante el tiempo necesario para
          seguridad u obligaciones legales; luego se elimina o anonimiza.
        </p>
        <p>
          <strong className="text-ink">Proveedores y voz.</strong> Supabase gestiona identidad y
          datos; Vercel y Railway entregan la aplicación. OpenAI procesa voz solo si autorizas esa
          función opcional. Ese procesamiento puede ocurrir fuera de Perú para responder;
          StarbizAcademy no conserva grabaciones de audio.
        </p>
        <p>
          <strong className="text-ink">Privacidad y anuncios.</strong> La publicidad se dirige a
          adultos; no usamos datos ni actividad del menor para personalizar o medir anuncios. El
          apoderado ve progreso, permisos y alertas necesarias, no sus conversaciones.
        </p>
        <p>
          <strong className="text-ink">Tus derechos.</strong> Puedes retirar permisos desde el panel
          familiar. Para solicitar acceso, corrección o eliminación, contacta al equipo mediante el
          canal oficial de soporte con el que contrataste el servicio. Retirar un permiso desactiva
          esa función. El estudiante creará su contraseña privada y decidirá su asentimiento por
          separado.
        </p>
      </div>
    </details>
  );
}

function ConsentChoice({
  checked,
  onChange,
  name,
  title,
  detail,
  required = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  title: string;
  detail: string;
  required?: boolean;
}) {
  return (
    <label className="mission-choice flex cursor-pointer items-start gap-3 border-0 px-5 py-4 shadow-none">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        required={required}
        className="mt-0.5 size-5 shrink-0 accent-[#5e5ce6] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-[13px] font-extrabold text-ink">
          {title}
          <span
            className={`text-[9px] uppercase tracking-wide ${required ? 'text-primary' : 'text-dim'}`}
          >
            {required ? 'Necesario' : 'Opcional'}
          </span>
        </span>
        <span className="mt-1 block text-[12px] leading-relaxed text-dim">{detail}</span>
      </span>
    </label>
  );
}
