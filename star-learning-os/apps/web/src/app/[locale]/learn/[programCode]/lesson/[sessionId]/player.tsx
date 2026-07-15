'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ActivityDto, SessionResponse, SubmissionResult } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Card, Chip } from '@/components/ui';

const STATE_LABELS: Record<string, string> = {
  developing: 'En desarrollo',
  provisional: 'Casi dominada',
  mastered: 'Dominada',
  review_required: 'Necesita repaso',
  exposed: 'Vista',
  not_seen: 'Nueva',
};

export function LessonPlayer({
  locale,
  programCode,
  sessionId,
}: {
  locale: string;
  programCode: string;
  sessionId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewItemId = searchParams.get('reviewItemId');
  const focusActivityId = searchParams.get('focusActivityId');

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clientApi<SessionResponse>(`/sessions/${sessionId}`)
      .then(setSession)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar la sesión'));
  }, [sessionId]);

  const activities = useMemo(() => {
    if (!session) return [];
    if (focusActivityId) return session.activities.filter((a) => a.id === focusActivityId);
    return session.activities;
  }, [session, focusActivityId]);

  if (error) {
    return <Card className="mt-10 border-risk/40 bg-risk-soft px-4 py-4 text-sm text-risk">{error}</Card>;
  }
  if (!session || activities.length === 0) {
    return <p className="mt-16 text-center text-sm text-dim">Cargando tu lección…</p>;
  }

  const activity = activities[index];
  const isLast = index + 1 >= activities.length;

  async function submit(response: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const submission = await clientApi<SubmissionResult>(
        `/sessions/${sessionId}/activities/${activity.id}/submissions`,
        {
          method: 'POST',
          body: JSON.stringify({
            response,
            usedAids: false,
            ...(reviewItemId ? { reviewItemId } : {}),
          }),
        },
      );
      setResult(submission);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu respuesta');
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    setResult(null);
    if (isLast) {
      await clientApi(`/sessions/${sessionId}/complete`, { method: 'POST' }).catch(() => undefined);
      router.push(`/${locale}/learn/${programCode}/${reviewItemId ? 'review' : 'today'}`);
      return;
    }
    setIndex(index + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rise">
        <p className="text-xs uppercase tracking-[0.14em] text-dim">
          {reviewItemId ? 'Repaso · recuperación espaciada' : 'Sesión de práctica'}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink">{session.lessonContract.objective}</p>
        <div className="mt-3 flex items-center gap-1.5">
          {activities.map((item, itemIndex) => (
            <span
              key={item.id}
              className={`h-1 flex-1 rounded-full ${
                itemIndex < index ? 'bg-gold' : itemIndex === index ? 'bg-primary' : 'bg-mist'
              }`}
            />
          ))}
        </div>
      </section>

      {!result && (
        <ActivityForm key={activity.id} activity={activity} busy={busy} onSubmit={submit} />
      )}

      {result && (
        <Card accent className="rise flex flex-col gap-4 px-5 py-5">
          <div className="flex items-center justify-between">
            <span className="font-display text-xl font-semibold text-ink">
              {result.correct === true ? 'Correcto.' : result.correct === false ? 'Aún no.' : 'Recibido.'}
            </span>
            <Chip tone={result.correct === false ? 'warn' : 'gold'}>
              {Math.round(result.score * 100)}%
            </Chip>
          </div>
          <p className="text-sm leading-relaxed text-dim">{result.feedback}</p>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-xs">
            <Chip tone={result.competencyState === 'mastered' ? 'gold' : 'primary'}>
              Competencia: {STATE_LABELS[result.competencyState] ?? result.competencyState}
            </Chip>
            {result.nextReviewAt && (
              <Chip>
                Próximo repaso:{' '}
                {new Date(result.nextReviewAt).toLocaleDateString('es-PE', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Chip>
            )}
            {result.humanReviewCreated && <Chip tone="warn">En revisión humana</Chip>}
          </div>
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-primary px-5 py-3 font-display font-semibold text-surface transition-colors hover:bg-primary-deep"
          >
            {isLast ? 'Terminar sesión' : 'Continuar'}
          </button>
        </Card>
      )}

      {error && <Card className="border-risk/40 bg-risk-soft px-4 py-3 text-sm text-risk">{error}</Card>}
    </div>
  );
}

function ActivityForm({
  activity,
  busy,
  onSubmit,
}: {
  activity: ActivityDto;
  busy: boolean;
  onSubmit: (response: Record<string, unknown>) => void;
}) {
  const prompt = activity.prompt as {
    instructions?: string;
    transcript?: string;
    stem?: string;
    options?: string[];
    text?: string;
    gaps?: number;
    hints?: string[];
    scenario?: string;
    minWords?: number;
  };
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [text, setText] = useState('');

  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

  return (
    <Card className="rise rise-1 flex flex-col gap-4 px-5 py-5">
      <div className="flex flex-wrap gap-2">
        <Chip tone="primary">
          {activity.skill === 'language_use' ? 'Uso del idioma' : activity.skill}
        </Chip>
        {activity.isTransferVariant && <Chip tone="gold">Transferencia · contexto nuevo</Chip>}
      </div>

      {prompt.instructions && <p className="text-sm leading-relaxed text-dim">{prompt.instructions}</p>}

      {prompt.transcript && (
        <blockquote className="rounded-lg border-l-2 border-l-primary bg-mist/60 px-4 py-3 font-display text-[15px] italic leading-relaxed text-ink">
          {prompt.transcript}
        </blockquote>
      )}

      {activity.kind === 'mcq' && (
        <>
          <p className="text-base font-medium text-ink">{prompt.stem}</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Opciones">
            {(prompt.options ?? []).map((option, optionIndex) => (
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
          <button
            type="button"
            disabled={selected === null || busy}
            onClick={() => onSubmit({ kind: 'mcq', selectedIndex: selected })}
            className="rounded-xl bg-primary px-5 py-3 font-display font-semibold text-surface transition-colors hover:bg-primary-deep disabled:opacity-40"
          >
            {busy ? 'Enviando…' : 'Responder'}
          </button>
        </>
      )}

      {activity.kind === 'gap_fill' && (
        <>
          <p className="text-base leading-loose text-ink">
            {(prompt.text ?? '').split('____').map((part, partIndex, parts) => (
              <span key={partIndex}>
                {part}
                {partIndex < parts.length - 1 && (
                  <input
                    aria-label={`Espacio ${partIndex + 1}`}
                    className="mx-1 inline-block w-32 rounded-md border border-line bg-surface px-2 py-1 text-center text-sm font-medium text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={answers[partIndex] ?? ''}
                    onChange={(event) => {
                      const next = [...answers];
                      next[partIndex] = event.target.value;
                      setAnswers(next);
                    }}
                  />
                )}
              </span>
            ))}
          </p>
          {prompt.hints && <p className="text-xs text-dim">Pistas: {prompt.hints.join(' · ')}</p>}
          <button
            type="button"
            disabled={busy || answers.filter((a) => a?.trim()).length < (prompt.gaps ?? 1)}
            onClick={() => onSubmit({ kind: 'gap_fill', answers })}
            className="rounded-xl bg-primary px-5 py-3 font-display font-semibold text-surface transition-colors hover:bg-primary-deep disabled:opacity-40"
          >
            {busy ? 'Enviando…' : 'Responder'}
          </button>
        </>
      )}

      {activity.kind === 'writing_prompt' && (
        <>
          {prompt.scenario && <p className="text-sm leading-relaxed text-ink">{prompt.scenario}</p>}
          <textarea
            aria-label="Tu texto"
            rows={8}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Escribe tu correo aquí…"
            className="rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex items-center justify-between text-xs text-dim">
            <span className="tabular-nums">
              {wordCount} palabras{prompt.minWords ? ` · mínimo ${prompt.minWords}` : ''}
            </span>
            <span>Evaluación provisional + revisión humana si es crítica</span>
          </div>
          <button
            type="button"
            disabled={busy || wordCount < 10}
            onClick={() => onSubmit({ kind: 'writing_prompt', text })}
            className="rounded-xl bg-primary px-5 py-3 font-display font-semibold text-surface transition-colors hover:bg-primary-deep disabled:opacity-40"
          >
            {busy ? 'Enviando…' : 'Entregar'}
          </button>
        </>
      )}
    </Card>
  );
}
