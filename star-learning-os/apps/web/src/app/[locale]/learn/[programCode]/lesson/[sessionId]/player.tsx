'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SessionResponse, SubmissionResult } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Chip, Icon, LoadingStack } from '@/components/ui';
import { ActivityForm, CtaBar, CtaButton } from './activity-form';
import { VictoryScreen, type SessionStats } from './victory-screen';

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
  const [victory, setVictory] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ answered: 0, correct: 0, bestCombo: 0, xp: 0 });
  const comboRef = useRef(0);

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

  if (victory) {
    return <VictoryScreen stats={stats} onContinue={finish} />;
  }

  const activity = activities[index];
  const isLast = index + 1 >= activities.length;
  const home = `/${locale}/learn/${programCode}/${reviewItemId ? 'review' : 'today'}`;
  const gainedXp = result?.correct === true ? 10 + (comboRef.current >= 3 ? 5 : 0) : 0;

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
      if (submission.correct === true) {
        comboRef.current += 1;
        const bonus = comboRef.current >= 3 ? 5 : 0;
        setStats((current) => ({
          answered: current.answered + 1,
          correct: current.correct + 1,
          bestCombo: Math.max(current.bestCombo, comboRef.current),
          xp: current.xp + 10 + bonus,
        }));
      } else {
        if (submission.correct === false) comboRef.current = 0;
        setStats((current) => ({ ...current, answered: current.answered + 1 }));
      }
      setResult(submission);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu respuesta');
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setResult(null);
    if (isLast) {
      setVictory(true);
      return;
    }
    setIndex(index + 1);
  }

  async function finish() {
    await clientApi(`/sessions/${sessionId}/complete`, { method: 'POST' }).catch(() => undefined);
    router.push(home);
  }

  const correct = result?.correct !== false;

  return (
    <div className="flex flex-col gap-6">
      <header className="rise">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push(home)}
            aria-label="Salir de la sesión"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-mist hover:text-ink"
          >
            <Icon name="exit" className="size-5" />
          </button>
          <div className="flex flex-1 items-center gap-1.5" aria-label={`Actividad ${index + 1} de ${activities.length}`}>
            {activities.map((item, itemIndex) => (
              <span
                key={item.id}
                className={`h-[6px] flex-1 rounded-full transition-colors duration-500 ${
                  itemIndex < index || (itemIndex === index && result)
                    ? 'bg-ok'
                    : itemIndex === index
                      ? 'bg-primary'
                      : 'bg-fill'
                }`}
              />
            ))}
          </div>
        </div>
        <p className="mt-5 text-[13px] font-semibold uppercase tracking-wide text-dim">
          {reviewItemId ? 'Repaso' : 'Sesión de práctica'}
        </p>
        <h1 className="mt-0.5 text-[24px] font-extrabold leading-tight tracking-tight text-ink">
          {session.lessonContract.objective}
        </h1>
      </header>

      {!result && (
        <ActivityForm key={activity.id} activity={activity} busy={busy} onSubmit={submit} />
      )}

      {result && (
        <>
          <div className="rise relative flex flex-col items-center gap-2 px-2 pt-4 text-center">
            {result.correct === true && (
              <span
                key={`xp-${index}`}
                className="xp-pop pointer-events-none absolute -top-2 text-[17px] font-extrabold text-ok"
              >
                +{gainedXp} XP
              </span>
            )}
            <span
              className={`flex size-16 items-center justify-center rounded-full ${
                correct ? 'bg-ok-soft' : 'bg-warn-soft'
              }`}
            >
              <Icon
                name={correct ? 'check' : 'review'}
                className={`size-8 ${correct ? 'text-ok' : 'text-gold-deep'}`}
              />
            </span>
            <p className="text-[26px] font-extrabold tracking-tight text-ink">
              {result.correct === true ? 'Correcto' : 'Aún no'}
            </p>
            {result.correct === true && comboRef.current >= 2 && (
              <p
                key={`combo-${index}-${comboRef.current}`}
                className="combo-pop flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-[14px] font-bold text-gold-deep"
              >
                <Icon name="flame" className="size-4" />
                ¡Racha de {comboRef.current}!
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
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
          </div>
          <CtaBar tone={correct ? 'ok' : 'warn'}>
            <p className="mb-3 text-[14px] leading-relaxed text-ink">{result.feedback}</p>
            <CtaButton onClick={next}>{isLast ? 'Ver mi resultado' : 'Continuar'}</CtaButton>
          </CtaBar>
        </>
      )}

      {error && (
        <div className="rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}
    </div>
  );
}
