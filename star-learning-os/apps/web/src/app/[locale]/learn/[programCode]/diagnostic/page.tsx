'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DiagnosticAttemptResponse, EnrollmentResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Card, Chip } from '@/components/ui';

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
  const [attempt, setAttempt] = useState<DiagnosticAttemptResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

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
        setEnrollmentId(enrollment.id);
        const created = await clientApi<DiagnosticAttemptResponse>(
          `/enrollments/${enrollment.id}/diagnostic-attempts`,
          { method: 'POST' },
        );
        setAttempt(created);
        setIndex(Math.min(created.answeredCount, created.items.length - 1));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo iniciar el diagnóstico');
      }
    }
    void boot();
  }, [locale, programCode, router]);

  if (error) {
    return <Card className="mt-10 border-risk/40 bg-risk-soft px-4 py-4 text-sm text-risk">{error}</Card>;
  }
  if (!attempt) {
    return <p className="mt-16 text-center text-sm text-dim">Preparando tu StarMap…</p>;
  }

  const item = attempt.items[index];
  const progress = (index / attempt.items.length) * 100;

  async function submitAnswer() {
    if (selected === null || !attempt) return;
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/diagnostic-attempts/${attempt.id}/responses`, {
        method: 'POST',
        body: JSON.stringify({ itemCode: item.code, selectedIndex: selected }),
      });
      setSelected(null);
      if (index + 1 < attempt.items.length) {
        setIndex(index + 1);
      } else {
        await clientApi(`/diagnostic-attempts/${attempt.id}/complete`, { method: 'POST' });
        router.push(`/${locale}/learn/${programCode}/today`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la respuesta');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rise">
        <p className="text-xs uppercase tracking-[0.14em] text-dim">StarMap 360 · diagnóstico inicial</p>
        <div className="mt-1 flex items-baseline justify-between">
          <h1 className="font-display text-xl font-semibold text-ink">
            Pregunta {index + 1} <span className="font-medium text-dim">de {attempt.items.length}</span>
          </h1>
          <span className="font-display text-sm tabular-nums text-dim">{Math.round(progress)}%</span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-mist">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-dim">
          Tu resultado será provisional: una persona del equipo académico lo confirma antes de
          volverse definitivo.
        </p>
      </section>

      <Card accent className="rise rise-1 flex flex-col gap-4 px-5 py-5">
        <Chip tone="primary">{SKILL_LABELS[item.skill] ?? item.skill}</Chip>
        <p className="text-base leading-relaxed text-ink">{item.prompt}</p>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Opciones">
          {item.options.map((option, optionIndex) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected === optionIndex}
              onClick={() => setSelected(optionIndex)}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                selected === optionIndex
                  ? 'border-primary bg-primary-soft font-medium text-ink'
                  : 'border-line bg-surface text-dim hover:border-primary/40 hover:text-ink'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </Card>

      <button
        type="button"
        disabled={selected === null || busy || enrollmentId === null}
        onClick={submitAnswer}
        className="rise rise-2 rounded-xl bg-primary px-6 py-4 font-display text-base font-semibold text-surface transition-colors hover:bg-primary-deep disabled:opacity-40"
      >
        {busy ? 'Guardando…' : index + 1 === attempt.items.length ? 'Terminar diagnóstico' : 'Siguiente'}
      </button>
    </div>
  );
}
