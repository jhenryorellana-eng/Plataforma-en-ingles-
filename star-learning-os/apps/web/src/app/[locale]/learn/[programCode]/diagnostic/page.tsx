'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DiagnosticNextResponse, EnrollmentResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Card, Group, Icon } from '@/components/ui';

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
  const [error, setError] = useState<string | null>(null);

  const fetchNext = useCallback(
    async (id: string) => {
      const next = await clientApi<DiagnosticNextResponse>(`/diagnostic-attempts/${id}/next-items`);
      if (next.stage === 'done') {
        await clientApi(`/diagnostic-attempts/${id}/complete`, { method: 'POST' });
        // Con el nivel detectado, el siguiente paso es elegir ritmo (Metodología §7.5).
        router.push(`/${locale}/learn/${programCode}/pace`);
        return;
      }
      setBatch(next);
      setQueueIndex(0);
    },
    [locale, programCode, router],
  );

  useEffect(() => {
    async function boot() {
      try {
        const enrollments = await clientApi<EnrollmentResponse[]>('/enrollments');
        const enrollment = enrollments.find((e) => e.program.code === programCode);
        if (!enrollment) {
          router.push(`/${locale}/enroll`);
          return;
        }
        if (enrollment.status !== 'pending_diagnostic') {
          router.push(`/${locale}/learn/${programCode}/today`);
          return;
        }
        const created = await clientApi<{ id: string }>(
          `/enrollments/${enrollment.id}/diagnostic-attempts`,
          { method: 'POST' },
        );
        setAttemptId(created.id);
        await fetchNext(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo iniciar el diagnóstico');
      }
    }
    void boot();
  }, [locale, programCode, router, fetchNext]);

  if (error) {
    return (
      <div className="mt-10 rounded-2xl bg-risk-soft px-4 py-4 text-center text-[14px] text-risk">
        {error}
      </div>
    );
  }
  if (!batch || !attemptId) {
    return <p className="mt-16 text-center text-[15px] text-dim">Preparando tu StarMap…</p>;
  }

  const item = batch.items[queueIndex];
  const answeredSoFar = batch.answeredCount + queueIndex;
  const progress = (answeredSoFar / batch.totalPlanned) * 100;
  const wordCount = writingText.trim().length === 0 ? 0 : writingText.trim().split(/\s+/).length;

  async function submitMcq() {
    if (selected === null || !item) return;
    setBusy(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : 'No se pudo guardar la respuesta');
    } finally {
      setBusy(false);
    }
  }

  async function submitWriting() {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/diagnostic-attempts/${attemptId}/writing`, {
        method: 'POST',
        body: JSON.stringify({ itemCode: item.code, text: writingText }),
      });
      await fetchNext(attemptId!);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu texto');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rise">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
          StarMap 360 · {batch.stageLabel}
        </p>
        <div className="mt-0.5 flex items-baseline justify-between">
          <h1 className="text-[30px] font-extrabold leading-tight tracking-tight text-ink">
            {item?.kind === 'writing' ? 'Muestra de escritura' : `Pregunta ${answeredSoFar + 1}`}
            {item?.kind !== 'writing' && (
              <span className="font-semibold text-dim"> de {batch.totalPlanned}</span>
            )}
          </h1>
          <span className="text-[15px] font-semibold tabular-nums text-dim">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-fill">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {item && item.kind === 'mcq' && (
        <>
          <Card className="rise rise-1 px-5 py-5">
            <p className="text-[13px] font-semibold text-dim">{SKILL_LABELS[item.skill] ?? item.skill}</p>
            <p className="mt-1.5 text-[17px] leading-relaxed text-ink">{item.prompt}</p>
          </Card>
          <Group className="rise rise-2">
            {item.options.map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected === optionIndex}
                onClick={() => setSelected(optionIndex)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-mist/60"
              >
                <span className="flex-1 text-[16px] text-ink">{option}</span>
                {selected === optionIndex && <Icon name="check" className="size-5 text-primary" />}
              </button>
            ))}
          </Group>
          <button
            type="button"
            disabled={selected === null || busy}
            onClick={submitMcq}
            className="rise rise-3 w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            {busy ? 'Guardando…' : 'Siguiente'}
          </button>
        </>
      )}

      {item && item.kind === 'writing' && (
        <>
          <Card className="rise rise-1 px-5 py-5">
            <p className="text-[15px] leading-relaxed text-ink">{item.prompt}</p>
          </Card>
          <Card className="rise rise-2 p-2">
            <textarea
              aria-label="Tu texto en inglés"
              rows={9}
              value={writingText}
              onChange={(event) => setWritingText(event.target.value)}
              placeholder="Write here in English…"
              className="w-full resize-none rounded-xl px-3 py-2.5 text-[16px] leading-relaxed text-ink placeholder:text-dim/60 focus:outline-none"
            />
          </Card>
          <div className="flex items-center justify-between px-1 text-[12px] text-dim">
            <span className="tabular-nums">
              {wordCount} palabras{item.minWords ? ` · mínimo ${item.minWords}` : ''}
            </span>
            <span>Se evalúa junto con el resto del diagnóstico</span>
          </div>
          <button
            type="button"
            disabled={busy || wordCount < (item.minWords ?? 40)}
            onClick={submitWriting}
            className="rise rise-3 w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            {busy ? 'Enviando…' : 'Entregar y ver mi resultado'}
          </button>
        </>
      )}

      <p className="px-5 text-center text-[12px] leading-relaxed text-dim">
        Tu resultado será provisional: una persona del equipo académico lo confirma antes de
        volverse definitivo.
      </p>
    </div>
  );
}
