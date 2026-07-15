'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollmentResponse } from '@star/contracts';
import { ClientApiError, clientApi } from '@/lib/client-api';
import { Card, Chip, StarLogo } from '@/components/ui';

const PACES = [
  {
    code: 'flex',
    name: 'Flex',
    hours: 8,
    voice: 90,
    detail: 'Compatible con una carga escolar moderada',
  },
  {
    code: 'accelerated',
    name: 'Accelerated',
    hours: 12,
    voice: 150,
    detail: 'El equilibrio recomendado entre velocidad y descanso',
    recommended: true,
  },
  {
    code: 'sprint',
    name: 'Sprint',
    hours: 19,
    voice: 240,
    detail: 'Solo con disponibilidad y bienestar validados',
  },
] as const;

export default function EnrollPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [selected, setSelected] = useState<string>('accelerated');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      const enrollment = await clientApi<EnrollmentResponse>('/enrollments', {
        method: 'POST',
        body: JSON.stringify({
          programCode: 'english-path',
          paceCode: selected,
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="rise">
        <StarLogo className="text-lg" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Elige tu ritmo</h1>
        <p className="mt-1 text-sm text-dim">
          El destino es el mismo — Starbiz Global B2 — y las puertas de dominio también. Solo cambia
          cuántas horas concentras por semana.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PACES.map((pace, index) => (
          <button
            key={pace.code}
            type="button"
            onClick={() => setSelected(pace.code)}
            className={`rise rise-${index + 1} text-left`}
          >
            <Card
              className={`px-4 py-4 transition-all ${
                selected === pace.code ? 'border-star bg-star/5' : 'hover:border-star/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold">{pace.name}</span>
                <div className="flex gap-2">
                  {'recommended' in pace && pace.recommended && <Chip tone="star">Recomendado</Chip>}
                  <Chip>{pace.hours} h/sem</Chip>
                </div>
              </div>
              <p className="mt-1 text-xs text-dim">
                {pace.detail} · {pace.voice} min de voz semanal incluidos
              </p>
            </Card>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={enroll}
        className="rise rise-4 rounded-2xl bg-star px-6 py-4 font-display font-semibold text-night disabled:opacity-50"
      >
        {busy ? 'Creando tu ruta…' : 'Empezar con el diagnóstico'}
      </button>

      {error && (
        <Card className="border-risk/40 px-4 py-3 text-sm text-risk">
          {error}
        </Card>
      )}
    </main>
  );
}
