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
    default: 'border-line bg-paper/85',
    ok: 'border-ok/25 bg-ok-soft',
    warn: 'border-gold/25 bg-warn-soft',
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
      className="btn-gradient w-full rounded-2xl py-3.5 text-[17px] font-semibold text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function ActivityForm({
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
          <p className="px-1 text-[19px] font-bold leading-snug tracking-tight text-ink">
            {prompt.stem}
          </p>
          <div role="radiogroup" className="flex flex-col gap-2.5">
            {(prompt.options ?? []).map((option, optionIndex) => {
              const active = selected === optionIndex;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(optionIndex)}
                  className={`flex w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left transition-all ${
                    active
                      ? 'border-primary bg-primary-soft shadow-[0_6px_18px_rgba(94,92,230,0.18)]'
                      : 'border-line bg-surface hover:border-primary/40 hover:bg-mist/60'
                  }`}
                >
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
                </button>
              );
            })}
          </div>
          <CtaBar>
            <CtaButton
              disabled={selected === null || busy}
              onClick={() => onSubmit({ kind: 'mcq', selectedIndex: selected })}
            >
              {busy ? 'Enviando…' : 'Responder'}
            </CtaButton>
          </CtaBar>
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
          <CtaBar>
            <CtaButton
              disabled={busy || answers.filter((a) => a?.trim()).length < (prompt.gaps ?? 1)}
              onClick={() => onSubmit({ kind: 'gap_fill', answers })}
            >
              {busy ? 'Enviando…' : 'Responder'}
            </CtaButton>
          </CtaBar>
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
              className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-[16px] leading-relaxed text-ink placeholder:text-dim/60 focus:outline-none"
            />
          </Card>
          <div className="flex items-center justify-between px-1 text-[12px] text-dim">
            <span className="tabular-nums">
              {wordCount} palabras{prompt.minWords ? ` · mínimo ${prompt.minWords}` : ''}
            </span>
            <span>Con revisión humana si es crítica</span>
          </div>
          <CtaBar>
            <CtaButton disabled={busy || wordCount < 10} onClick={() => onSubmit({ kind: 'writing_prompt', text })}>
              {busy ? 'Enviando…' : 'Entregar'}
            </CtaButton>
          </CtaBar>
        </>
      )}
    </div>
  );
}
