'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollmentResponse } from '@star/contracts';
import { ClientApiError, clientApi } from '@/lib/client-api';
import { AppIcon, Group, Row } from '@/components/ui';

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
      setError(err instanceof Error ? err.message : 'No se pudo crear la inscripción');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="rise flex flex-col items-center text-center">
        <AppIcon className="size-16" />
        <h1 className="mt-5 text-[28px] font-extrabold leading-tight tracking-tight text-ink">
          English Path
        </h1>
        <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-dim">
          Primero medimos tu nivel real con StarMap. Con tu resultado, elegirás el ritmo que mejor
          encaje con tu semana.
        </p>
      </div>

      <div className="rise rise-1 mt-8">
        <Group>
          <Row
            icon="progress"
            iconColor="bg-blue"
            title="1 · Diagnóstico StarMap"
            subtitle="Lectura, escucha y uso del idioma — tu nivel por habilidad"
          />
          <Row
            icon="route"
            iconColor="bg-primary"
            title="2 · Elige tu ritmo"
            subtitle="Flex, Accelerated o Sprint, con tu fecha estimada de llegada a B2"
          />
          <Row
            icon="today"
            iconColor="bg-teal"
            title="3 · Empieza tu ruta"
            subtitle="Plan diario con tu Mentor: mismas puertas de dominio en todo ritmo"
          />
        </Group>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={enroll}
        className="rise rise-2 mt-6 w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? 'Creando tu inscripción…' : 'Empezar con el diagnóstico'}
      </button>

      {error && (
        <div className="rise mt-4 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
    </main>
  );
}
