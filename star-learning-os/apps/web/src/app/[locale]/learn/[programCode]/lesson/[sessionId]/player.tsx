'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ActivityDto, SessionResponse, SubmissionResult } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Card, Chip, Group, Icon, LoadingStack } from '@/components/ui';

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
    return (
      <div className="mt-10 rounded-2xl bg-risk-soft px-4 py-4 text-center text-[14px] text-risk">
        {error}
      </div>
    );
  }
  if (!session || activities.length === 0) {
    return <LoadingStack label="Cargando tu lección" />;
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
    <div className="flex flex-col gap-6">
      <header className="rise">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
          {reviewItemId ? 'Repaso' : 'Sesión de práctica'}
        </p>
        <h1 className="mt-0.5 text-[24px] font-extrabold leading-tight tracking-tight text-ink">
          {session.lessonContract.objective}
        </h1>
        <div className="mt-4 flex items-center gap-1.5">
          {activities.map((item, itemIndex) => (
            <span
              key={item.id}
              className={`h-[5px] flex-1 rounded-full transition-colors ${
                itemIndex < index ? 'bg-ok' : itemIndex === index ? 'bg-primary' : 'bg-fill'
              }`}
            />
          ))}
        </div>
      </header>

      {!result && (
        <ActivityForm key={activity.id} activity={activity} busy={busy} onSubmit={submit} />
      )}

      {result && (
        <Card className="rise flex flex-col gap-4 px-5 py-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <span
              className={`flex size-14 items-center justify-center rounded-full ${
                result.correct === false ? 'bg-warn-soft' : 'bg-ok-soft'
              }`}
            >
              <Icon
                name={result.correct === false ? 'review' : 'check'}
                className={`size-7 ${result.correct === false ? 'text-gold-deep' : 'text-ok'}`}
              />
            </span>
            <p className="text-[24px] font-extrabold tracking-tight text-ink">
              {result.correct === true ? 'Correcto' : result.correct === false ? 'Aún no' : 'Recibido'}
            </p>
            <p className="max-w-[38ch] text-[15px] leading-relaxed text-dim">{result.feedback}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-line pt-4">
            <Chip tone={result.competencyState === 'mastered' ? 'ok' : 'primary'}>
              {STATE_LABELS[result.competencyState] ?? result.competencyState}
            </Chip>
            <Chip>{Math.round(result.score * 100)}%</Chip>
            {result.nextReviewAt && (
              <Chip>
                Repaso:{' '}
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
            className="w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            {isLast ? 'Terminar sesión' : 'Continuar'}
          </button>
        </Card>
      )}

      {error && (
        <div className="rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
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
    <div className="rise rise-1 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 px-1">
        <Chip tone="primary">
          {activity.skill === 'language_use' ? 'Uso del idioma' : activity.skill}
        </Chip>
        {activity.isTransferVariant && <Chip tone="gold">Transferencia · contexto nuevo</Chip>}
      </div>

      {(prompt.instructions || prompt.transcript) && (
        <Card className="px-5 py-4">
          {prompt.instructions && (
            <p className="text-[14px] leading-relaxed text-dim">{prompt.instructions}</p>
          )}
          {prompt.transcript && (
            <p className="mt-3 rounded-xl bg-mist px-4 py-3 text-[15px] leading-relaxed text-ink">
              {prompt.transcript}
            </p>
          )}
        </Card>
      )}

      {activity.kind === 'mcq' && (
        <>
          <p className="px-1 text-[17px] font-semibold leading-snug text-ink">{prompt.stem}</p>
          <Group>
            {(prompt.options ?? []).map((option, optionIndex) => (
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
            onClick={() => onSubmit({ kind: 'mcq', selectedIndex: selected })}
            className="w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            {busy ? 'Enviando…' : 'Responder'}
          </button>
        </>
      )}

      {activity.kind === 'gap_fill' && (
        <>
          <Card className="px-5 py-5">
            <p className="text-[17px] leading-loose text-ink">
              {(prompt.text ?? '').split('____').map((part, partIndex, parts) => (
                <span key={partIndex}>
                  {part}
                  {partIndex < parts.length - 1 && (
                    <input
                      aria-label={`Espacio ${partIndex + 1}`}
                      className="mx-1 inline-block w-32 rounded-lg bg-mist px-2 py-1 text-center text-[15px] font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            {prompt.hints && (
              <p className="mt-3 text-[13px] text-dim">Pistas: {prompt.hints.join(' · ')}</p>
            )}
          </Card>
          <button
            type="button"
            disabled={busy || answers.filter((a) => a?.trim()).length < (prompt.gaps ?? 1)}
            onClick={() => onSubmit({ kind: 'gap_fill', answers })}
            className="w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            {busy ? 'Enviando…' : 'Responder'}
          </button>
        </>
      )}

      {activity.kind === 'writing_prompt' && (
        <>
          {prompt.scenario && (
            <p className="px-1 text-[15px] leading-relaxed text-ink">{prompt.scenario}</p>
          )}
          <Card className="p-2">
            <textarea
              aria-label="Tu texto"
              rows={9}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Escribe tu correo aquí…"
              className="w-full resize-none rounded-xl px-3 py-2.5 text-[16px] leading-relaxed text-ink placeholder:text-dim/60 focus:outline-none"
            />
          </Card>
          <div className="flex items-center justify-between px-1 text-[12px] text-dim">
            <span className="tabular-nums">
              {wordCount} palabras{prompt.minWords ? ` · mínimo ${prompt.minWords}` : ''}
            </span>
            <span>Con revisión humana si es crítica</span>
          </div>
          <button
            type="button"
            disabled={busy || wordCount < 10}
            onClick={() => onSubmit({ kind: 'writing_prompt', text })}
            className="w-full rounded-2xl bg-primary py-3.5 text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
          >
            {busy ? 'Enviando…' : 'Entregar'}
          </button>
        </>
      )}
    </div>
  );
}
