'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollmentResponse } from '@star/contracts';
import { ClientApiError, clientApi } from '@/lib/client-api';
import { AuroraHero, AuroraSurface } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';
import { IconTile, Wordmark } from '@/components/ui';

export default function EnrollPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      // Sin ritmo: la Metodología §7.5 lo elige DESPUÉS del diagnóstico.
      const enrollment = await clientApi<EnrollmentResponse>('/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          programCode: 'english-path',
          supportLanguage: 'es',
          interfaceLocale: 'es-PE',
          targetVariety: 'en-US',
        }),
      });
      router.push(`/${locale}/learn/${enrollment.program.code}/diagnostic`);
    } catch (err) {
      if (err instanceof ClientApiError && err.code === 'ENROLLMENT_ALREADY_EXISTS') {
        router.push(`/${locale}/learn`);
        return;
      }
      if (
        err instanceof ClientApiError &&
        (err.code === 'GUARDIAN_LINK_REQUIRED' || err.code === 'CONSENT_REQUIRED')
      ) {
        // Falta el onboarding familiar: vínculo y permisos primero (Especificación §15.3).
        router.push(`/${locale}/onboarding/guardian`);
        return;
      }
      if (err instanceof ClientApiError && err.code === 'ASSENT_REQUIRED') {
        router.push(`/${locale}/onboarding/assent`);
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo crear la inscripción');
      setBusy(false);
    }
  }

  return (
    <div className="mission-shell min-h-dvh overflow-x-clip">
      <header className="material-bar border-b border-line/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Wordmark />
          <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">
            Expedición Aurora
          </span>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-5xl px-3.5 pb-14 pt-4 sm:px-6 sm:pt-7">
        <AuroraHero
          asset="starmap"
          eyebrow="English Path · punto de partida"
          title="Descubramos dónde comienza tu ruta."
          body="StarMap mide tu nivel por habilidad. Con el resultado elegirás un ritmo realista para tu semana, sin perder las mismas metas de dominio."
          tone="cyan"
          priority
          imageAlt="Ruta de aprendizaje StarMap proyectada como una constelación"
          compact
          badge={
            <span className="rounded-full border border-white/20 bg-[#071525]/70 px-3 py-1.5 text-[10px] font-bold text-white/85 backdrop-blur-md">
              Primera misión
            </span>
          }
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <NovaGuide state="thinking" className="rise">
            No necesitas prepararte. Responde con calma: cada respuesta me ayuda a encontrar el
            punto correcto para ti.
          </NovaGuide>

          <AuroraSurface className="rise rise-1 overflow-hidden" tone="cyan">
            <div className="border-b border-line px-4 py-4 sm:px-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-teal">
                Tu plan de vuelo
              </p>
              <h2 className="mt-1 text-[20px] font-extrabold tracking-tight text-ink">
                Tres pasos, una ruta hecha para ti
              </h2>
            </div>

            <ol className="divide-y divide-line">
              <li className="flex gap-3.5 px-4 py-4 sm:px-5">
                <IconTile name="progress" color="bg-blue" className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink">1. Diagnóstico StarMap</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
                    Lectura, escucha y uso del idioma para ubicar tu nivel por habilidad.
                  </p>
                </div>
              </li>
              <li className="flex gap-3.5 px-4 py-4 sm:px-5">
                <IconTile name="route" color="bg-primary" className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink">2. Elige tu ritmo</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
                    Compara Flex, Accelerated o Sprint y su fecha estimada de llegada a B2.
                  </p>
                </div>
              </li>
              <li className="flex gap-3.5 px-4 py-4 sm:px-5">
                <IconTile name="today" color="bg-teal" className="mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-ink">3. Empieza tu ruta</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-dim">
                    Recibe un plan diario con Nova y las mismas puertas de dominio en cualquier
                    ritmo.
                  </p>
                </div>
              </li>
            </ol>
          </AuroraSurface>
        </div>

        <div className="rise rise-2 mx-auto mt-6 max-w-xl">
          <button
            type="button"
            disabled={busy}
            aria-describedby="enroll-action-hint"
            onClick={enroll}
            className="tactile-button flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[16px] font-extrabold text-white disabled:cursor-wait disabled:opacity-55"
          >
            {busy ? 'Preparando tu StarMap…' : 'Empezar mi diagnóstico'}
          </button>
          <p
            id="enroll-action-hint"
            className="mt-3 text-center text-[11.5px] leading-relaxed text-dim"
          >
            Podrás avanzar a tu ritmo. El diagnóstico se reanuda si necesitas salir.
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
