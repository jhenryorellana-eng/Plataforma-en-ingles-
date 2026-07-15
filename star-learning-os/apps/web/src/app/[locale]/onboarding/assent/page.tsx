'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { Group, Icon, Row } from '@/components/ui';

export default function AssentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const router = useRouter();
  const [understandsAi, setUnderstandsAi] = useState(false);
  const [understandsControls, setUnderstandsControls] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assent() {
    setBusy(true);
    setError(null);
    try {
      await clientApi('/assents', { method: 'POST', body: JSON.stringify({}) });
      router.push(`/${locale}/enroll`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar tu asentimiento');
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <header className="rise">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
          Paso 2 de 2 · Antes de empezar
        </p>
        <h1 className="mt-0.5 text-[28px] font-extrabold leading-tight tracking-tight text-ink">
          Esto es lo que debes saber
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-dim">
          Léelo con calma — es tu asentimiento, no un trámite de tu apoderado.
        </p>
      </header>

      <div className="rise rise-1 mt-6">
        <Group>
          <Row
            icon="mic"
            iconColor="bg-primary"
            title="Tu Mentor es una inteligencia artificial"
            subtitle="Es cálido y te acompaña, pero no es una persona — y siempre te lo dirá"
          />
          <Row
            icon="shield"
            iconColor="bg-teal"
            title="Tu audio de práctica no se guarda"
            subtitle="Solo queda la evidencia mínima de tu aprendizaje, y tu apoderado ve tu progreso, no tus conversaciones"
          />
          <Row
            icon="flag"
            iconColor="bg-gold"
            title="Puedes pausar, salir o reportar siempre"
            subtitle="Si algo te incomoda o hay una situación de riesgo, una persona del equipo puede intervenir para ayudarte"
          />
        </Group>
      </div>

      <div className="rise rise-2 mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          role="checkbox"
          aria-checked={understandsAi}
          onClick={() => setUnderstandsAi((value) => !value)}
          className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
              understandsAi ? 'border-primary bg-primary' : 'border-line bg-surface'
            }`}
          >
            {understandsAi && <Icon name="check" className="size-4 text-white" />}
          </span>
          <span className="text-[14px] leading-snug text-ink">
            Entiendo que hablaré con una IA educativa, no con una persona.
          </span>
        </button>
        <button
          type="button"
          role="checkbox"
          aria-checked={understandsControls}
          onClick={() => setUnderstandsControls((value) => !value)}
          className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
              understandsControls ? 'border-primary bg-primary' : 'border-line bg-surface'
            }`}
          >
            {understandsControls && <Icon name="check" className="size-4 text-white" />}
          </span>
          <span className="text-[14px] leading-snug text-ink">
            Sé que puedo pausar, salir y reportar en cualquier momento.
          </span>
        </button>
      </div>

      <button
        type="button"
        disabled={busy || !understandsAi || !understandsControls}
        onClick={assent}
        className="rise rise-3 mt-6 w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
      >
        {busy ? 'Registrando…' : 'Doy mi asentimiento'}
      </button>

      {error && (
        <div className="mt-4 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
    </main>
  );
}
