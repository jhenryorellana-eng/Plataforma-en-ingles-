'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DiagnosticAttemptResponse, EnrollmentResponse } from '@star/contracts';
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
    return (
      <div className="mt-10 rounded-2xl bg-risk-soft px-4 py-4 text-center text-[14px] text-risk">
        {error}
      </div>
    );
  }
  if (!attempt) {
    return <p className="mt-16 text-center text-[15px] text-dim">Preparando tu StarMap…</p>;
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
        // Con el nivel detectado, el siguiente paso es elegir ritmo (Metodología §7.5).
        router.push(`/${locale}/learn/${programCode}/pace`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la respuesta');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rise">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
          StarMap 360 · {SKILL_LABELS[item.skill] ?? item.skill}
        </p>
        <h1 className="mt-0.5 text-[30px] font-extrabold leading-tight tracking-tight text-ink">
          Pregunta {index + 1} <span className="font-semibold text-dim">de {attempt.items.length}</span>
        </h1>
        <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-fill">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <Card className="rise rise-1 px-5 py-5">
        <p className="text-[17px] leading-relaxed text-ink">{item.prompt}</p>
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
        disabled={selected === null || busy || enrollmentId === null}
        onClick={submitAnswer}
        className="rise rise-3 w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
      >
        {busy ? 'Guardando…' : index + 1 === attempt.items.length ? 'Terminar diagnóstico' : 'Siguiente'}
      </button>

      <p className="px-5 text-center text-[12px] leading-relaxed text-dim">
        Tu resultado será provisional: una persona del equipo académico lo confirma antes de
        volverse definitivo.
      </p>
    </div>
  );
}
