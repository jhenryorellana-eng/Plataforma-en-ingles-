'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InvitationResponse, OnboardingStatus } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Card, Group, Icon, Row } from '@/components/ui';

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
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const current = await clientApi<OnboardingStatus>('/onboarding/status');
      setStatus(current);
      if (current.invitation) setInvitation(current.invitation);
      if (!current.isMinor) router.push(`/${locale}/enroll`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu estado');
    }
  }, [locale, router]);

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
    return <p className="mt-16 text-center text-[15px] text-dim">Cargando…</p>;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <header className="rise">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
          Paso 1 de 2 · Tu apoderado
        </p>
        <h1 className="mt-0.5 text-[28px] font-extrabold leading-tight tracking-tight text-ink">
          Necesitas un adulto que te autorice
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-dim">
          Como tienes menos de 18, tu apoderado autoriza el servicio y los permisos. Tú mantienes tu
          propia experiencia: verá tu progreso, no tus conversaciones.
        </p>
      </header>

      {!invitation && (
        <Card className="rise rise-1 mt-6 flex flex-col gap-3 px-5 py-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-dim">Correo de tu apoderado</span>
            <input
              type="email"
              value={guardianEmail}
              onChange={(event) => setGuardianEmail(event.target.value)}
              placeholder="apoderado@correo.com"
              className="rounded-xl bg-mist px-4 py-3 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </label>
          <button
            type="button"
            disabled={busy || !guardianEmail.includes('@')}
            onClick={invite}
            className="rounded-2xl bg-primary py-3 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            {busy ? 'Creando invitación…' : 'Invitar a mi apoderado'}
          </button>
        </Card>
      )}

      {invitation && (
        <Card className="rise rise-1 mt-6 flex flex-col items-center gap-2 px-5 py-6 text-center">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
            Código de invitación
          </p>
          <p className="text-[40px] font-extrabold tracking-[0.18em] text-primary">
            {invitation.code}
          </p>
          <p className="max-w-[36ch] text-[13px] leading-relaxed text-dim">
            Tu apoderado ({invitation.guardianEmail}) debe crear su cuenta de apoderado y escribir
            este código en su portal. En producción, esta invitación llega por correo verificado.
          </p>
        </Card>
      )}

      <div className="rise rise-2 mt-6">
        <Group>
          <Row
            icon={status.hasActiveLink ? 'check' : 'shield'}
            iconColor={status.hasActiveLink ? 'bg-ok' : 'bg-fill'}
            title="Vínculo con tu apoderado"
            trailing={
              <span className={status.hasActiveLink ? 'font-semibold text-ok-deep' : ''}>
                {status.hasActiveLink ? 'Activo' : 'Pendiente'}
              </span>
            }
          />
          <Row
            icon={status.consents.includes('service') ? 'check' : 'shield'}
            iconColor={status.consents.includes('service') ? 'bg-ok' : 'bg-fill'}
            title="Permiso de servicio"
            trailing={
              <span className={status.consents.includes('service') ? 'font-semibold text-ok-deep' : ''}>
                {status.consents.includes('service') ? 'Otorgado' : 'Pendiente'}
              </span>
            }
          />
          <Row
            icon={status.consents.includes('ai_voice') ? 'check' : 'mic'}
            iconColor={status.consents.includes('ai_voice') ? 'bg-ok' : 'bg-fill'}
            title="Voz con IA (para hablar con tu Mentor)"
            trailing={
              <span className={status.consents.includes('ai_voice') ? 'font-semibold text-ok-deep' : ''}>
                {status.consents.includes('ai_voice') ? 'Otorgado' : 'Pendiente'}
              </span>
            }
          />
        </Group>
        <p className="mt-2 px-5 text-[12px] text-dim">
          Esta pantalla se actualiza sola cuando tu apoderado acepte y otorgue permisos.
        </p>
      </div>

      <button
        type="button"
        disabled={!status.readyToEnroll}
        onClick={() =>
          router.push(status.hasAssent ? `/${locale}/enroll` : `/${locale}/onboarding/assent`)
        }
        className="rise rise-3 mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
      >
        Continuar <Icon name="arrow" className="size-4.5" />
      </button>

      {error && (
        <div className="mt-4 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
    </main>
  );
}
