'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollmentResponse } from '@star/contracts';
import { ClientApiError, clientApi } from '@/lib/client-api';
import { AppIcon, Chip, Group, Icon, SectionHeader } from '@/components/ui';

const PACES = [
  { code: 'flex', name: 'Flex', hours: 8, voice: 90, detail: 'Compatible con una carga escolar moderada' },
  {
    code: 'accelerated',
    name: 'Accelerated',
    hours: 12,
    voice: 150,
    detail: 'El equilibrio recomendado entre velocidad y descanso',
    recommended: true,
  },
  { code: 'sprint', name: 'Sprint', hours: 19, voice: 240, detail: 'Solo con disponibilidad y bienestar validados' },
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="rise flex flex-col items-center text-center">
        <AppIcon className="size-16" />
        <h1 className="mt-5 text-[28px] font-extrabold leading-tight tracking-tight text-ink">
          Elige tu ritmo
        </h1>
        <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-dim">
          El destino es el mismo — Starbiz Global B2 — y las puertas de dominio también. Solo cambia
          cuántas horas concentras por semana.
        </p>
      </div>

      <div className="rise rise-1 mt-8">
        <SectionHeader>Planes</SectionHeader>
        <Group>
          {PACES.map((pace) => (
            <button
              key={pace.code}
              type="button"
              role="radio"
              aria-checked={selected === pace.code}
              onClick={() => setSelected(pace.code)}
              className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-mist/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-semibold text-ink">{pace.name}</span>
                  {'recommended' in pace && pace.recommended && <Chip tone="primary">Recomendado</Chip>}
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-dim">
                  {pace.hours} h/semana · {pace.voice} min de voz · {pace.detail}
                </p>
              </div>
              {selected === pace.code && <Icon name="check" className="size-5 shrink-0 text-primary" />}
            </button>
          ))}
        </Group>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={enroll}
        className="rise rise-2 mt-6 w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? 'Creando tu ruta…' : 'Empezar con el diagnóstico'}
      </button>

      {error && (
        <div className="rise mt-4 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
    </main>
  );
}
