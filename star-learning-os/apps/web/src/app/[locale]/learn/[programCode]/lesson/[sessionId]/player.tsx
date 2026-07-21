'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SessionResponse, SubmissionResult } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Chip, EmptyState, Icon, LoadingStack } from '@/components/ui';
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
  /** Error de CARGA (pantalla completa con reintento) — jamás se mezcla con el de envío. */
  const [bootError, setBootError] = useState<string | null>(null);
  /** Error de ENVÍO (inline): la lección y lo escrito por el alumno NO se destruyen. */
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [victory, setVictory] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ answered: 0, correct: 0, bestCombo: 0, xp: 0 });
  const comboRef = useRef(0);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setBootError(null);
    clientApi<SessionResponse>(`/sessions/${sessionId}`)
      .then(setSession)
      .catch((err) => setBootError(err instanceof Error ? err.message : 'No se pudo cargar la sesión'));
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (result) feedbackRef.current?.focus();
  }, [result]);

  const activities = useMemo(() => {
    if (!session) return [];
    if (focusActivityId) return session.activities.filter((a) => a.id === focusActivityId);
    return session.activities;
  }, [session, focusActivityId]);

  const home = `/${locale}/learn/${programCode}/${reviewItemId ? 'review' : 'today'}`;

  async function submit(response: Record<string, unknown>) {
    const current = activities[index];
    if (!current) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const submission = await clientApi<SubmissionResult>(
        `/sessions/${sessionId}/activities/${current.id}/submissions`,
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
        setStats((prev) => ({
          answered: prev.answered + 1,
          correct: prev.correct + 1,
          bestCombo: Math.max(prev.bestCombo, comboRef.current),
          xp: prev.xp + 10 + bonus,
        }));
      } else {
        if (submission.correct === false) comboRef.current = 0;
        setStats((prev) => ({ ...prev, answered: prev.answered + 1 }));
      }
      setResult(submission);
    } catch (err) {
      // Inline: el formulario sigue montado con la respuesta del alumno intacta.
      setSubmitError(err instanceof Error ? err.message : 'No se pudo enviar tu respuesta');
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setResult(null);
    setSubmitError(null);
    if (index + 1 >= activities.length) {
      setVictory(true);
      return;
    }
    setIndex(index + 1);
  }

  async function finish() {
    // El progreso ya quedó guardado con cada submission; el cierre otorga el
    // premio de lección: si falla la red se reintenta una vez antes de salir.
    try {
      await clientApi(`/sessions/${sessionId}/complete`, { method: 'POST' });
    } catch {
      await clientApi(`/sessions/${sessionId}/complete`, { method: 'POST' }).catch(() => undefined);
    }
    router.push(home);
  }

  if (bootError) {
    return (
      <div className="rise mt-10 flex flex-col items-center gap-4 rounded-2xl bg-risk-soft px-6 py-8 text-center">
        <p className="text-[15px] font-medium text-risk">{bootError}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={load}
            className="rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-white"
          >
            Reintentar
          </button>
          <Link href={home} className="text-[14px] font-medium text-dim">
            Volver
          </Link>
        </div>
      </div>
    );
  }
  if (!session) {
    return <LoadingStack label="Cargando tu lección" />;
  }
  if (activities.length === 0) {
    // p. ej. focusActivityId que ya no existe: salida clara, nunca spinner eterno.
    return (
      <EmptyState
        icon="review"
        iconColor="bg-gold"
        title="No encontramos esa actividad"
        body="La actividad que buscabas ya no está disponible en esta sesión. Vuelve y elige otra para seguir practicando."
        action={
          <Link
            href={home}
            className="btn-gradient inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-[15px] font-semibold text-white"
          >
            Volver
            <Icon name="arrow" className="size-4 text-white" />
          </Link>
        }
      />
    );
  }

  if (victory) {
    return <VictoryScreen stats={stats} onContinue={finish} />;
  }

  const activity = activities[index];
  const isLast = index + 1 >= activities.length;
  const gainedXp = result?.correct === true ? 10 + (comboRef.current >= 3 ? 5 : 0) : 0;
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

      <ActivityForm
        key={activity.id}
        activity={activity}
        busy={busy}
        locked={Boolean(result)}
        onSubmit={submit}
      />

      {submitError && !result && (
        <p role="alert" className="rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] font-medium text-risk">
          {submitError}. Inténtalo de nuevo, tu respuesta sigue ahí.
        </p>
      )}

      {result && (
        <>
          <div
            ref={feedbackRef}
            role="status"
            aria-live="polite"
            tabIndex={-1}
            className="rise relative flex flex-col items-center gap-2 px-2 pt-4 text-center outline-none"
          >
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
            <p className="sr-only">{result.feedback}</p>
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
    </div>
  );
}
