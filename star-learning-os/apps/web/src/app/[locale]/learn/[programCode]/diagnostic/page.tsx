'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DiagnosticNextResponse, EnrollmentResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Icon, LoadingStack } from '@/components/ui';
import { AuroraHero, AuroraSurface } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';

const SKILL_LABELS: Record<string, string> = {
  reading: 'Lectura',
  listening: 'Escucha',
  language_use: 'Uso del idioma',
  speaking: 'Expresión oral',
  writing: 'Escritura',
};

export default function DiagnosticPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = use(params);
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [batch, setBatch] = useState<DiagnosticNextResponse | null>(null);
  const [queueIndex, setQueueIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [writingText, setWritingText] = useState('');
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const bootPromiseRef = useRef<Promise<void> | null>(null);

  const fetchNext = useCallback(
    async (id: string) => {
      const next = await clientApi<DiagnosticNextResponse>(`/diagnostic-attempts/${id}/next-items`);
      if (next.stage === 'done') {
        await clientApi(`/diagnostic-attempts/${id}/complete`, { method: 'POST' });
        router.push(`/${locale}/learn/${programCode}/pace`);
        return;
      }
      setBatch(next);
      setQueueIndex(0);
    },
    [locale, programCode, router],
  );

  const boot = useCallback(async () => {
    // React StrictMode repite los effects en desarrollo. Compartir la promesa
    // evita dos POST y también deduplica un doble clic rápido en Reintentar.
    if (bootPromiseRef.current) return bootPromiseRef.current;
    const run = (async () => {
      setBootError(null);
      try {
        const enrollments = await clientApi<EnrollmentResponse[]>('/enrollments');
        const enrollment = enrollments.find((candidate) => candidate.program.code === programCode);
        if (!enrollment) {
          router.push(`/${locale}/enroll`);
          return;
        }
        if (enrollment.status !== 'pending_diagnostic') {
          router.push(
            `/${locale}/learn/${programCode}/${enrollment.paceConfirmed ? 'today' : 'pace'}`,
          );
          return;
        }
        const created = await clientApi<{ id: string }>(
          `/enrollments/${enrollment.id}/diagnostic-attempts`,
          { method: 'POST' },
        );
        setAttemptId(created.id);
        await fetchNext(created.id);
      } catch (err) {
        setBootError(err instanceof Error ? err.message : 'No se pudo iniciar el diagnóstico');
      }
    })();
    bootPromiseRef.current = run;
    try {
      await run;
    } finally {
      if (bootPromiseRef.current === run) bootPromiseRef.current = null;
    }
  }, [locale, programCode, router, fetchNext]);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (bootError) {
    return (
      <div className="rise mx-auto mt-8 flex max-w-xl flex-col gap-5">
        <NovaGuide state="paused" eyebrow="Nova · señal interrumpida">
          No perdimos tu ruta. Necesitamos volver a conectar para preparar el diagnóstico.
        </NovaGuide>
        <AuroraSurface tone="coral" className="p-6 text-center">
          <p role="alert" className="text-[14px] font-semibold text-risk">
            {bootError}
          </p>
          <button
            type="button"
            onClick={() => void boot()}
            className="tactile-button mt-5 min-h-12 rounded-2xl px-6 text-[14px] font-extrabold text-white"
          >
            Reconectar StarMap
          </button>
        </AuroraSurface>
      </div>
    );
  }

  if (!batch || !attemptId) {
    return (
      <div className="flex flex-col gap-5">
        <AuroraHero
          asset="starmap"
          eyebrow="Calibración inicial"
          title="Preparando tu StarMap"
          body="Estamos activando una ruta de preguntas que se adapta a tus respuestas. No necesitas estudiar antes."
          tone="cyan"
          compact
          priority
        />
        <LoadingStack label="Sincronizando lectura, escucha, idioma y escritura" />
      </div>
    );
  }

  const item = batch.items[queueIndex];
  const answeredSoFar = batch.answeredCount + queueIndex;
  const progress = (answeredSoFar / batch.totalPlanned) * 100;
  const wordCount = writingText.trim().length === 0 ? 0 : writingText.trim().split(/\s+/).length;

  async function submitMcq() {
    if (selected === null || !item) return;
    setBusy(true);
    setSubmitError(null);
    try {
      await clientApi(`/diagnostic-attempts/${attemptId}/responses`, {
        method: 'POST',
        body: JSON.stringify({ itemCode: item.code, selectedIndex: selected }),
      });
      setSelected(null);
      if (queueIndex + 1 < batch!.items.length) {
        setQueueIndex(queueIndex + 1);
      } else {
        await fetchNext(attemptId!);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar la respuesta');
    } finally {
      setBusy(false);
    }
  }

  async function submitWriting() {
    if (!item) return;
    setBusy(true);
    setSubmitError(null);
    try {
      await clientApi(`/diagnostic-attempts/${attemptId}/writing`, {
        method: 'POST',
        body: JSON.stringify({ itemCode: item.code, text: writingText }),
      });
      setWritingText('');
      await fetchNext(attemptId!);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo enviar tu texto');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rise flex flex-col gap-4">
        <NovaGuide compact state={item?.kind === 'writing' ? 'thinking' : 'idle'}>
          {item?.kind === 'writing'
            ? 'Escribe con naturalidad. Aquí importa cómo comunicas la idea, no sonar perfecto.'
            : 'Responde con calma. Cada elección me ayuda a encontrar tu punto de partida real.'}
        </NovaGuide>

        <AuroraSurface tone="cyan" className="overflow-hidden px-5 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[17px] border border-cyan-300/25 bg-cyan-300/10 text-cyan-300 shadow-[0_4px_0_#06111f]">
              <Icon name={item?.kind === 'writing' ? 'pencil' : 'route'} className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mission-kicker text-[9px] text-teal">
                StarMap 360 · {batch.stageLabel}
              </p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <h1 className="min-w-0 text-[25px] font-extrabold leading-none tracking-[-0.04em] text-ink sm:text-[30px]">
                  {item?.kind === 'writing'
                    ? 'Muestra de escritura'
                    : `Pregunta ${answeredSoFar + 1}`}
                  {item?.kind !== 'writing' && (
                    <span className="font-semibold text-dim"> de {batch.totalPlanned}</span>
                  )}
                </h1>
                <span className="shrink-0 text-[14px] font-extrabold tabular-nums text-primary-deep">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
          </div>
          <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-fill">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#596cff,#26d9f5,#ffd35a)] shadow-[0_0_14px_rgba(38,217,245,.45)] transition-[width] duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </AuroraSurface>
      </header>

      {item?.kind === 'mcq' && (
        <>
          <AuroraSurface tone="blue" className="rise rise-1 px-5 py-5 sm:px-6">
            <p className="mission-kicker text-[9px] text-primary-deep">
              {SKILL_LABELS[item.skill] ?? item.skill}
            </p>
            <p className="mt-2 text-[17px] font-semibold leading-relaxed text-ink sm:text-[18px]">
              {item.prompt}
            </p>
          </AuroraSurface>

          <div
            role="radiogroup"
            aria-label="Opciones de respuesta"
            className="rise rise-2 grid gap-3"
          >
            {item.options.map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected === optionIndex}
                disabled={busy}
                onClick={() => setSelected(optionIndex)}
                className={`mission-choice flex min-h-14 w-full items-center gap-3 rounded-[19px] px-4 py-3.5 text-left ${
                  selected === optionIndex ? 'border-primary bg-primary-soft ring-2 ring-primary/20' : ''
                }`}
              >
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold ${
                    selected === optionIndex ? 'bg-primary text-white' : 'bg-mist text-dim'
                  }`}
                  aria-hidden
                >
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span className="flex-1 text-[15px] font-semibold leading-snug text-ink sm:text-[16px]">
                  {option}
                </span>
                {selected === optionIndex && <Icon name="check" className="size-5 text-primary" />}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={selected === null || busy}
            onClick={submitMcq}
            className="tactile-button rise rise-3 min-h-14 w-full rounded-2xl text-[16px] font-extrabold text-white disabled:opacity-50"
          >
            {busy ? 'Guardando…' : 'Activar siguiente punto →'}
          </button>
        </>
      )}

      {item?.kind === 'writing' && (
        <>
          <AuroraSurface tone="gold" className="rise rise-1 px-5 py-5 sm:px-6">
            <p className="mission-kicker text-[9px] text-gold-deep">Bitácora en inglés</p>
            <p className="mt-2 text-[16px] font-semibold leading-relaxed text-ink">{item.prompt}</p>
          </AuroraSurface>
          <AuroraSurface className="rise rise-2 p-2" tone="cyan">
            <textarea
              aria-label="Tu texto en inglés"
              rows={9}
              value={writingText}
              onChange={(event) => setWritingText(event.target.value)}
              placeholder="Write here in English…"
              className="w-full resize-none rounded-[18px] bg-paper/60 px-4 py-3.5 text-[16px] leading-relaxed text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-teal/50"
            />
          </AuroraSurface>
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-dim">
            <span className="tabular-nums">
              {wordCount} palabras{item.minWords ? ` · mínimo ${item.minWords}` : ''}
            </span>
            <span>Se evalúa junto con el resto del diagnóstico</span>
          </div>
          <button
            type="button"
            disabled={busy || wordCount < (item.minWords ?? 40)}
            onClick={submitWriting}
            className="tactile-button rise rise-3 min-h-14 w-full rounded-2xl text-[16px] font-extrabold text-white disabled:opacity-50"
          >
            {busy ? 'Enviando…' : 'Entregar bitácora y ver mi ruta'}
          </button>
        </>
      )}

      {submitError && (
        <p
          role="alert"
          className="rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] font-medium text-risk"
        >
          {submitError}. Inténtalo de nuevo, tu trabajo sigue aquí.
        </p>
      )}

      <p className="px-5 text-center text-[12px] leading-relaxed text-dim">
        Tu resultado será provisional: una persona del equipo académico lo confirma antes de
        volverse definitivo.
      </p>
    </div>
  );
}
