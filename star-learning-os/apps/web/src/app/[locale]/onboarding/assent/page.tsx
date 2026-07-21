'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { AuroraSurface } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';
import { IconTile, Wordmark } from '@/components/ui';

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
    <div className="mission-shell min-h-dvh overflow-x-clip">
      <header className="material-bar border-b border-line/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Wordmark />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-primary">
            Paso 2 de 2
          </span>
        </div>
      </header>

      <main className="mx-auto min-w-0 max-w-4xl px-3.5 pb-14 pt-5 sm:px-6 sm:pt-8">
        <header className="rise max-w-2xl">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-teal">
            Información sobre IA y privacidad
          </p>
          <h1 className="mt-2 text-[clamp(2rem,6vw,3.4rem)] font-extrabold leading-[0.98] tracking-[-0.05em] text-ink text-balance">
            Antes de empezar, tú también decides.
          </h1>
          <p className="mt-4 max-w-[62ch] text-[13.5px] leading-relaxed text-dim">
            Léelo con calma. Este es tu asentimiento personal, no un trámite de tu apoderado. Nada
            se marcará por ti.
          </p>
        </header>

        <NovaGuide
          state="paused"
          eyebrow="Nova · mentora educativa con IA"
          className="rise rise-1 mt-6 max-w-2xl"
        >
          Soy una inteligencia artificial, no una persona. Puedes detener una sesión o pedir ayuda
          cuando lo necesites.
        </NovaGuide>

        <section className="rise rise-2 mt-6" aria-labelledby="assent-information-title">
          <h2 id="assent-information-title" className="sr-only">
            Información necesaria para decidir
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            <AuroraSurface className="p-4 sm:p-5" tone="blue">
              <IconTile name="mic" color="bg-primary" />
              <h3 className="mt-4 text-[15px] font-extrabold leading-snug text-ink">
                Nova es una inteligencia artificial
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-dim">
                Te acompaña durante la práctica, pero no es una persona y debe identificarse siempre
                como IA.
              </p>
            </AuroraSurface>
            <AuroraSurface className="p-4 sm:p-5" tone="cyan">
              <IconTile name="shield" color="bg-teal" />
              <h3 className="mt-4 text-[15px] font-extrabold leading-snug text-ink">
                Tu audio de práctica no se guarda
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-dim">
                Solo queda la evidencia mínima de aprendizaje. Tu apoderado ve progreso, no tus
                conversaciones.
              </p>
            </AuroraSurface>
            <AuroraSurface className="p-4 sm:p-5" tone="gold">
              <IconTile name="flag" color="bg-gold" />
              <h3 className="mt-4 text-[15px] font-extrabold leading-snug text-ink">
                Conservas el control
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-dim">
                Puedes pausar, salir o reportar. Una persona del equipo puede intervenir si existe
                una situación de riesgo.
              </p>
            </AuroraSurface>
          </div>
        </section>

        <form
          className="rise rise-3 mx-auto mt-6 max-w-2xl"
          onSubmit={(event) => {
            event.preventDefault();
            void assent();
          }}
        >
          <fieldset>
            <legend className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-ink">
              Confirma únicamente si lo comprendiste
            </legend>
            <div className="mt-3 flex flex-col gap-3">
              <label className="mission-choice flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl px-4 py-3.5 sm:px-5">
                <input
                  type="checkbox"
                  name="understands-ai"
                  checked={understandsAi}
                  onChange={(event) => setUnderstandsAi(event.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[#5e5ce6] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
                />
                <span className="text-[13.5px] font-semibold leading-relaxed text-ink">
                  Entiendo que hablaré con una IA educativa, no con una persona.
                </span>
              </label>
              <label className="mission-choice flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl px-4 py-3.5 sm:px-5">
                <input
                  type="checkbox"
                  name="understands-controls"
                  checked={understandsControls}
                  onChange={(event) => setUnderstandsControls(event.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-[#5e5ce6] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
                />
                <span className="text-[13.5px] font-semibold leading-relaxed text-ink">
                  Sé que puedo pausar, salir y reportar en cualquier momento.
                </span>
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={busy || !understandsAi || !understandsControls}
            aria-describedby="assent-action-hint"
            className="tactile-button mt-5 min-h-14 w-full rounded-2xl px-5 text-[16px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Registrando tu decisión…' : 'Confirmar mi asentimiento'}
          </button>
          <p
            id="assent-action-hint"
            className="mt-3 text-center text-[11.5px] leading-relaxed text-dim"
          >
            El botón se habilita después de marcar las dos confirmaciones.
          </p>
        </form>

        {error && (
          <div
            className="mx-auto mt-4 max-w-2xl rounded-2xl border border-risk/20 bg-risk-soft px-4 py-3 text-center text-[13px] font-medium text-risk"
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
