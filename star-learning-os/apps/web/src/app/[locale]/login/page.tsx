'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MeResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Card, Icon, InitialsAvatar, StarMark, Wordmark } from '@/components/ui';

const PROFILES = [
  {
    profile: 'learner_teen',
    name: 'Diego Torres',
    detail: 'Alumno 14–17 · English Path B1 · autorizaciones completas',
  },
  {
    profile: 'learner_young',
    name: 'Lucía Torres',
    detail: 'Alumna 12–13 · las sesiones de voz exigen ZDR verificado (D17)',
  },
  {
    profile: 'guardian',
    name: 'Ana Torres',
    detail: 'Apoderada · progreso, permisos y consumo de sus hijos',
  },
  {
    profile: 'staff',
    name: 'Prof. Rivas',
    detail: 'Equipo académico · revisión humana y casos de protección',
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
      <div className="rise">
        <div className="masthead-rule mb-6 w-16" />
        <Wordmark />
        <h1 className="mt-5 font-display text-[2rem] font-semibold leading-tight text-ink">
          Una ruta medible hacia tu meta en inglés.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dim">
          Diagnóstico real, dominio verificable y preparación TOEFL con supervisión académica
          humana. Entorno de demostración: elige un perfil — en producción, esta pantalla es
          Identity Platform.
        </p>
      </div>

      <div className="flex flex-col gap-3" role="list">
        {PROFILES.map((item, index) => (
          <button
            key={item.profile}
            type="button"
            role="listitem"
            disabled={loading !== null}
            onClick={() => login(item.profile)}
            className={`rise rise-${index + 1} text-left`}
          >
            <Card className="flex items-center gap-4 px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_4px_14px_rgba(28,36,52,0.08)]">
              <InitialsAvatar name={item.name} />
              <span className="min-w-0 flex-1">
                <span className="block font-display font-semibold text-ink">{item.name}</span>
                <span className="block text-xs leading-relaxed text-dim">{item.detail}</span>
              </span>
              <span className="text-primary">
                {loading === item.profile ? (
                  <span className="text-xs text-dim">Entrando…</span>
                ) : (
                  <Icon name="arrow" className="size-4" />
                )}
              </span>
            </Card>
          </button>
        ))}
      </div>

      <p className="rise rise-4 flex items-center gap-2 text-xs text-dim">
        <StarMark className="size-3 text-gold" />
        La IA personaliza el apoyo y el tiempo; el estándar de salida no cambia.
      </p>

      {error && (
        <Card className="border-risk/40 bg-risk-soft px-4 py-3 text-sm text-risk">
          {error} — ¿levantaste la API y el seed? (`pnpm db:up && pnpm db:migrate && pnpm db:seed`)
        </Card>
      )}
    </main>
  );
}
