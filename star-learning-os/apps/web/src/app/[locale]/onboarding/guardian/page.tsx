'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InvitationResponse, OnboardingStatus } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { AuroraSurface } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';
import { Icon, IconTile, Wordmark } from '@/components/ui';

const POLL_INTERVAL_MS = 4000;

export default function OnboardingGuardianPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const router = useRouter();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [guardianEmail, setGuardianEmail] = useState('');
  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);
  const [busy, setBusy] = useState(false);
  /** Error de la acción de invitar (inline). */
  const [error, setError] = useState<string | null>(null);
  /** Error del poll de estado (pantalla completa si aún no hay datos). */
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const current = await clientApi<OnboardingStatus>('/onboarding/status');
      setStatus(current);
      setLoadError(null);
      setInvitation((visible) => {
        if (current.invitation?.code) return current.invitation;
        if (
          visible?.code &&
          current.invitation?.status === 'pending' &&
          visible.guardianEmail === current.invitation.guardianEmail
        ) {
          return { ...current.invitation, code: visible.code };
        }
        return null;
      });
      if (current.invitation && !guardianEmail) setGuardianEmail(current.invitation.guardianEmail);
      if (!current.isMinor) router.push(`/${locale}/enroll`);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar tu estado');
    }
  }, [guardianEmail, locale, router]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  async function invite() {
    setBusy(true);
    setError(null);
    try {
      setInvitation(
        await clientApi<InvitationResponse>('/family-invitations', {
          method: 'POST',
          body: JSON.stringify({ guardianEmail }),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la invitación');
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    // Si la PRIMERA carga falla, jamás un "Cargando…" eterno: error con reintento.
    if (loadError) {
      return (
        <div className="mission-shell min-h-dvh px-4 py-8">
          <div className="mx-auto w-full max-w-md">
            <Wordmark />
            <AuroraSurface className="mt-12 px-5 py-7 text-center" tone="coral">
              <IconTile
                name="shield"
                color="bg-risk"
                className="mx-auto size-11 rounded-2xl [&>svg]:size-5"
              />
              <h1 className="mt-4 text-[22px] font-extrabold tracking-tight text-ink">
                No pudimos revisar tu vínculo
              </h1>
              <p className="mt-2 text-[13px] leading-relaxed text-risk" role="alert">
                {loadError}
              </p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="tactile-button mt-5 min-h-12 w-full rounded-2xl px-5 text-[14px] font-extrabold text-white"
              >
                Reintentar
              </button>
            </AuroraSurface>
          </div>
        </div>
      );
    }
    return (
      <div className="mission-shell flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md" role="status" aria-live="polite">
          <NovaGuide state="thinking">
            Estoy comprobando el estado de tu vínculo familiar…
          </NovaGuide>
        </div>
      </div>
    );
  }

  const hasService = status.consents.includes('service');
  const hasStorage = status.consents.includes('storage');
  const hasVoice = status.consents.includes('ai_voice');
  const readyToContinue = status.hasActiveLink && hasService && hasStorage;

  return (
    <div className="mission-shell min-h-dvh overflow-x-clip">
      <header className="material-bar border-b border-line/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Wordmark />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-primary">
            Paso 1 de 2
          </span>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-4xl px-3.5 pb-14 pt-5 sm:px-6 sm:pt-8">
        <header className="rise max-w-2xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-teal">
            Enlace de acompañamiento
          </p>
          <h1 className="mt-2 text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.05em] text-ink text-balance">
            Conecta a tu apoderado con tu ruta.
          </h1>
          <p className="mt-4 max-w-[60ch] text-[13.5px] leading-relaxed text-dim">
            Como tienes menos de 18 años, un adulto debe autorizar el servicio y sus permisos. Tu
            experiencia sigue siendo privada: verá tu progreso, no tus conversaciones.
          </p>
        </header>

        <NovaGuide
          state={readyToContinue ? 'celebrate' : 'idle'}
          className="rise rise-1 mt-6 max-w-2xl"
        >
          {readyToContinue
            ? 'La autorización necesaria está lista. Ya puedes continuar con tu propio asentimiento.'
            : 'Envía una invitación y deja esta pantalla abierta. Revisaré el estado automáticamente.'}
        </NovaGuide>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.08fr] lg:items-start">
          {!invitation ? (
            <AuroraSurface className="rise rise-2 p-4 sm:p-5" tone="blue">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void invite();
                }}
              >
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-primary">
                    Crear invitación segura
                  </p>
                  <h2 className="mt-1.5 text-[20px] font-extrabold tracking-tight text-ink">
                    ¿A qué correo la enviamos?
                  </h2>
                </div>
                <label htmlFor="guardian-email" className="mt-5 flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold text-ink">Correo de tu apoderado</span>
                  <input
                    id="guardian-email"
                    name="guardian-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    aria-describedby="guardian-email-hint"
                    value={guardianEmail}
                    onChange={(event) => setGuardianEmail(event.target.value)}
                    placeholder="apoderado@correo.com"
                    className="min-h-12 rounded-xl border border-line bg-mist px-4 py-3 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </label>
                <p id="guardian-email-hint" className="mt-2 text-[11.5px] leading-relaxed text-dim">
                  El código solo funcionará con la cuenta creada usando este mismo correo.
                </p>
                <button
                  type="submit"
                  disabled={busy || !guardianEmail.includes('@')}
                  className="tactile-button mt-5 min-h-12 w-full rounded-2xl px-4 text-[14px] font-extrabold text-white disabled:opacity-50"
                >
                  {busy ? 'Creando invitación…' : 'Crear invitación'}
                </button>
              </form>
            </AuroraSurface>
          ) : (
            <AuroraSurface
              className="rise rise-2 overflow-hidden p-4 text-center sm:p-5"
              tone="gold"
            >
              <span className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-gold/25 bg-gold-soft">
                <Icon name="shield" className="size-5 text-gold-deep" />
              </span>
              <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gold-deep">
                Código de invitación
              </p>
              <p className="mt-2 break-all text-[clamp(1.8rem,10vw,2.6rem)] font-extrabold tracking-[0.14em] text-primary">
                {invitation.code}
              </p>
              <p className="mx-auto mt-3 max-w-[39ch] text-[12px] leading-relaxed text-dim">
                Compártelo directamente con tu apoderado. Debe crear su cuenta con{' '}
                <strong className="break-all text-ink">{invitation.guardianEmail}</strong>,
                verificar ese correo y escribir el código en su portal.
              </p>
            </AuroraSurface>
          )}

          <AuroraSurface className="rise rise-3 overflow-hidden" tone="neutral">
            <div className="border-b border-line px-4 py-4 sm:px-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-teal">
                Estado del enlace
              </p>
              <h2 className="mt-1 text-[18px] font-extrabold tracking-tight text-ink">
                Autorizaciones necesarias
              </h2>
            </div>
            <ul className="divide-y divide-line" aria-label="Estado de autorización familiar">
              {[
                {
                  label: 'Vínculo con tu apoderado',
                  complete: status.hasActiveLink,
                  icon: 'shield' as const,
                  completeText: 'Activo',
                },
                {
                  label: 'Permiso de servicio',
                  complete: hasService,
                  icon: 'shield' as const,
                  completeText: 'Otorgado',
                },
                {
                  label: 'Almacenamiento de evidencia',
                  complete: hasStorage,
                  icon: 'lock' as const,
                  completeText: 'Otorgado',
                },
                {
                  label: 'Voz con IA (opcional)',
                  complete: hasVoice,
                  icon: 'mic' as const,
                  completeText: 'Otorgado',
                },
              ].map((item) => (
                <li key={item.label} className="flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5">
                  <IconTile
                    name={item.complete ? 'check' : item.icon}
                    color={item.complete ? 'bg-ok' : 'bg-fill'}
                  />
                  <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-ink">
                    {item.label}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                      item.complete ? 'bg-ok-soft text-ok-deep' : 'bg-fill text-dim'
                    }`}
                  >
                    {item.complete ? item.completeText : 'Pendiente'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-line px-4 py-3 text-[11px] leading-relaxed text-dim sm:px-5">
              Esta pantalla se actualiza sola cuando tu apoderado acepta y configura los permisos.
            </p>
          </AuroraSurface>
        </div>

        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          Vínculo {status.hasActiveLink ? 'activo' : 'pendiente'}. Permiso de servicio{' '}
          {hasService ? 'otorgado' : 'pendiente'}. Almacenamiento{' '}
          {hasStorage ? 'otorgado' : 'pendiente'}.
        </p>

        <div className="rise rise-3 mx-auto mt-6 max-w-xl">
          <button
            type="button"
            disabled={!readyToContinue}
            aria-describedby="guardian-continue-hint"
            onClick={() =>
              router.push(status.hasAssent ? `/${locale}/enroll` : `/${locale}/onboarding/assent`)
            }
            className="tactile-button flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 text-[16px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Continuar <Icon name="arrow" className="size-4.5" />
          </button>
          <p
            id="guardian-continue-hint"
            className="mt-3 text-center text-[11.5px] leading-relaxed text-dim"
          >
            {readyToContinue
              ? 'El vínculo y los permisos necesarios están listos.'
              : 'Se habilitará cuando el vínculo, el servicio y el almacenamiento estén autorizados.'}
          </p>
        </div>

        {error && (
          <div
            className="mx-auto mt-4 max-w-xl rounded-2xl border border-risk/20 bg-risk-soft px-4 py-3 text-center text-[13px] font-medium text-risk"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
