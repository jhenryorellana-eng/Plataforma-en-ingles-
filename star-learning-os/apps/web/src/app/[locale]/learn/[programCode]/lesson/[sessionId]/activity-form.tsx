'use client';

import { useState, type ReactNode } from 'react';
import type { ActivityDto } from '@star/contracts';
import { Card, Chip } from '@/components/ui';

/** Barra de acción fija e inmersiva (safe-area), centrada como el contenido. */
export function CtaBar({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'ok' | 'warn';
}) {
  const tones: Record<string, string> = {
    default: 'border-line bg-surface/94',
    ok: 'border-ok/25 bg-surface/96',
    warn: 'border-gold/25 bg-surface/96',
  };
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-xl ${tones[tone]}`}>
      <div className="mx-auto w-full max-w-2xl px-4 pb-[max(env(safe-area-inset-bottom),14px)] pt-3.5">
        {children}
      </div>
    </div>
  );
}

/** Botón primario del player: degradado de marca y estados claros. */
export function CtaButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="tactile-button w-full rounded-2xl py-3.5 text-[16px] font-extrabold text-white disabled:opacity-45"
    >
      {children}
    </button>
  );
}

export function ActivityForm({
  activity,
  busy,
  locked = false,
  onSubmit,
}: {
  activity: ActivityDto;
  busy: boolean;
  locked?: boolean;
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
  const questionId = `activity-${activity.id}-prompt`;

  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  // Los huecos reales del texto mandan: nunca el `gaps` declarado, que puede no coincidir.
  const gapCount = (prompt.text ?? '').split('____').length - 1;
  const filledGaps = Array.from({ length: gapCount }, (_, gapIndex) => answers[gapIndex]?.trim() ?? '').filter(
    (answer) => answer.length > 0,
  ).length;

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
          <p id={questionId} className="px-1 text-[19px] font-bold leading-snug tracking-tight text-ink">
            {prompt.stem}
          </p>
          <div role="radiogroup" aria-labelledby={questionId} className="flex flex-col gap-2.5">
            {(prompt.options ?? []).map((option, optionIndex) => {
              const active = selected === optionIndex;
              return (
                <label
                  key={option}
                  className={`mission-choice flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-left transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/60 ${
                    active
                      ? 'border-primary bg-primary-soft shadow-[0_4px_0_#3443b3]'
                      : ''
                  } ${locked ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <input
                    type="radio"
                    name={`activity-${activity.id}`}
                    value={optionIndex}
                    checked={active}
                    disabled={locked}
                    onChange={() => setSelected(optionIndex)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      active ? 'border-primary' : 'border-[#c7c7cc]'
                    }`}
                  >
                    {active && <span className="size-2.5 rounded-full bg-primary" />}
                  </span>
                  <span className={`flex-1 text-[16px] leading-snug ${active ? 'font-semibold text-ink' : 'text-ink'}`}>
                    {option}
                  </span>
                </label>
              );
            })}
          </div>
          {!locked && <CtaBar>
            <CtaButton
              disabled={selected === null || busy}
              onClick={() => onSubmit({ kind: 'mcq', selectedIndex: selected })}
            >
              {busy ? 'Enviando…' : 'Responder'}
            </CtaButton>
          </CtaBar>}
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
                      disabled={locked}
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
          {!locked && <CtaBar>
            <CtaButton
              disabled={busy || filledGaps < gapCount}
              onClick={() =>
                onSubmit({
                  kind: 'gap_fill',
                  answers: Array.from({ length: gapCount }, (_, gapIndex) => answers[gapIndex]?.trim() ?? ''),
                })
              }
            >
              {busy ? 'Enviando…' : 'Responder'}
            </CtaButton>
          </CtaBar>}
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
              disabled={locked}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Escribe tu correo aquí…"
              className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-[16px] leading-relaxed text-ink placeholder:text-dim/60 focus:outline-none"
            />
          </Card>
          <div className="flex items-center justify-between px-1 text-[12px] text-dim">
            <span className="tabular-nums">
              {wordCount} palabras{prompt.minWords ? ` · mínimo ${prompt.minWords}` : ''}
            </span>
            <span>Con revisión humana si es crítica</span>
          </div>
          {!locked && <CtaBar>
            <CtaButton disabled={busy || wordCount < (prompt.minWords ?? 10)} onClick={() => onSubmit({ kind: 'writing_prompt', text })}>
              {busy ? 'Enviando…' : 'Entregar'}
            </CtaButton>
          </CtaBar>}
        </>
      )}
    </div>
  );
}
