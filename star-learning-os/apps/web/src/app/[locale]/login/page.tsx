'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Card, StarLogo } from '@/components/ui';

const PROFILES = [
  {
    profile: 'learner_teen',
    name: 'Diego, 15 años',
    detail: 'Alumno 14–17 · English Path B1 · todo autorizado',
    emoji: '🧑‍🚀',
  },
  {
    profile: 'learner_young',
    name: 'Lucía, 12 años',
    detail: 'Alumna 12–13 · la voz se bloquea sin ZDR (gate D17)',
    emoji: '👧',
  },
  {
    profile: 'guardian',
    name: 'Ana Torres',
    detail: 'Apoderada · progreso, permisos y consumo',
    emoji: '👩‍👧‍👦',
  },
  {
    profile: 'staff',
    name: 'Prof. Rivas',
    detail: 'Staff académico · revisión humana y safety',
    emoji: '🎓',
  },
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
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <div className="rise text-center">
        <StarLogo className="text-2xl" />
        <h1 className="mt-6 font-display text-3xl font-semibold leading-tight">
          Tu ruta al inglés,
          <br />
          <span className="text-star">estrella por estrella</span>
        </h1>
        <p className="mt-3 text-sm text-dim">
          Corte vertical de demostración. Elige un perfil de la familia demo — en producción esta
          pantalla es Identity Platform.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {PROFILES.map((item, index) => (
          <button
            key={item.profile}
            type="button"
            disabled={loading !== null}
            onClick={() => login(item.profile)}
            className={`rise rise-${index + 1} text-left`}
          >
            <Card className="flex items-center gap-4 px-4 py-3.5 transition-all hover:border-star/50 hover:bg-raised">
              <span className="text-2xl" aria-hidden>
                {item.emoji}
              </span>
              <span className="flex-1">
                <span className="block font-medium">{item.name}</span>
                <span className="block text-xs text-dim">{item.detail}</span>
              </span>
              <span className="text-star" aria-hidden>
                {loading === item.profile ? '…' : '→'}
              </span>
            </Card>
          </button>
        ))}
      </div>

      {error && (
        <Card className="border-risk/40 px-4 py-3 text-sm text-risk">
          {error} — ¿levantaste la API y el seed? (`pnpm db:up && pnpm db:migrate && pnpm db:seed`)
        </Card>
      )}
    </main>
  );
}
