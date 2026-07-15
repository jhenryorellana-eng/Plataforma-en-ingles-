'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { AppIcon, Group, Icon, InitialsAvatar, SectionHeader } from '@/components/ui';

const PROFILES = [
  { profile: 'learner_teen', name: 'Diego Torres', detail: 'Alumno 14–17 · todo autorizado' },
  { profile: 'learner_young', name: 'Lucía Torres', detail: 'Alumna 12–13 · voz sujeta a ZDR' },
  { profile: 'guardian', name: 'Ana Torres', detail: 'Apoderada' },
  { profile: 'staff', name: 'Prof. Rivas', detail: 'Equipo académico' },
] as const;

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function login(profile: (typeof PROFILES)[number]['profile']) {
    setLoading(profile);
    setError(null);
    try {
      const me = await clientApi<MeResponse>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ profile }),
      });
      if (me.role === 'guardian') router.push(`/${locale}/family`);
      else if (me.role === 'staff') router.push(`/${locale}/staff`);
      else router.push(`/${locale}/learn`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
      setLoading(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="rise flex flex-col items-center text-center">
        <AppIcon className="size-20" />
        <h1 className="mt-6 text-[32px] font-extrabold leading-tight tracking-tight text-ink">
          StarbizAcademy
        </h1>
        <p className="mt-2 max-w-[30ch] text-[16px] leading-relaxed text-dim">
          Tu ruta medible desde tu nivel real hasta tu meta en inglés.
        </p>
      </div>

      <div className="rise rise-2 mt-10">
        <SectionHeader>Continuar como</SectionHeader>
        <Group>
          {PROFILES.map((item) => (
            <button
              key={item.profile}
              type="button"
              disabled={loading !== null}
              onClick={() => login(item.profile)}
              className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-mist/60 active:bg-mist disabled:opacity-60"
            >
              <InitialsAvatar name={item.name} className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold text-ink">{item.name}</span>
                <span className="block text-[13px] text-dim">{item.detail}</span>
              </span>
              {loading === item.profile ? (
                <span className="text-[13px] text-dim">Entrando…</span>
              ) : (
                <Icon name="chevron" className="size-4 text-[#c7c7cc]" />
              )}
            </button>
          ))}
        </Group>
        <p className="mt-3 px-5 text-center text-[12px] leading-relaxed text-dim">
          Entorno de demostración. En producción, el acceso es con Identity Platform y verificación
          del apoderado.
        </p>
      </div>

      {error && (
        <div className="rise mt-4 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
    </main>
  );
}
