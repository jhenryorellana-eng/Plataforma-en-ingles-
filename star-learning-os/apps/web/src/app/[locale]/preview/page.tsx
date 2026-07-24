'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { PreviewEstimateResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { AppIcon, Chip, Icon } from '@/components/ui';
import { PublicShell } from '@/components/public-shell';

interface PreviewItem {
  code: string;
  skill: string;
  prompt: string;
  options: string[];
}

const ANSWER_LETTERS = ['A', 'B', 'C', 'D'];

const SKILL_META: Record<string, { label: string; symbol: string; hint: string }> = {
  reading: {
    label: 'Lectura',
    symbol: 'Aa',
    hint: 'Lee con calma: busca la opción que hace que toda la frase tenga sentido.',
  },
  listening: {
    label: 'Escucha',
    symbol: '♪',
    hint: 'Imagina la situación y concéntrate en el dato principal del anuncio.',
  },
  language_use: {
    label: 'Uso del idioma',
    symbol: '✓',
    hint: 'Observa las pistas de tiempo y la forma que necesita la oración.',
  },
  speaking: {
    label: 'Expresión oral',
    symbol: '●',
    hint: 'Elige la respuesta que usarías de manera natural en una conversación.',
  },
  writing: {
    label: 'Escritura',
    symbol: '✎',
    hint: 'Busca la opción más clara, correcta y natural para completar la idea.',
  },
};

export default function PreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ itemCode: string; selectedIndex: number }>>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<PreviewEstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    clientApi<PreviewItem[]>('/preview/items')
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar el Preview'));
  }, []);

  async function next() {
    if (selected === null) return;
    const updated = [...answers, { itemCode: items[index].code, selectedIndex: selected }];
    setAnswers(updated);
    setSelected(null);
    if (index + 1 < items.length) {
      setIndex(index + 1);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      setResult(
        await clientApi<PreviewEstimateResponse>('/preview/estimate', {
          method: 'POST',
          body: JSON.stringify({ answers: updated }),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo estimar tu nivel');
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentItem = items[index];
  const currentSkill = currentItem
    ? (SKILL_META[currentItem.skill] ?? SKILL_META.reading)
    : SKILL_META.reading;
  const progress = items.length > 0 ? Math.round(((index + 1) / items.length) * 100) : 0;

  return (
    <PublicShell>
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-7 sm:px-7 sm:py-10">
        <header className="rise flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <AppIcon className="size-11 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#70eaff]">
                StarMap · reto rápido
              </p>
              <h1 className="text-[17px] font-extrabold leading-tight tracking-tight text-ink sm:text-[20px]">
                Descubre tu punto de partida
              </h1>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[11px] font-bold text-dim">
            Sin registro
          </span>
        </header>

        {error && (
          <div
            role="alert"
            className="rise mt-5 rounded-[22px] border border-risk/20 bg-risk-soft px-5 py-4 text-center text-[14px] leading-relaxed text-risk"
          >
            {error}
          </div>
        )}

        {!result && items.length === 0 && !error && (
          <div className="mt-7 space-y-4" aria-label="Preparando el reto">
            <div className="h-3 animate-pulse rounded-full bg-fill" />
            <div className="h-36 animate-pulse rounded-[28px] border border-line bg-panel" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((placeholder) => (
                <div
                  key={placeholder}
                  className="h-20 animate-pulse rounded-[22px] border border-line bg-panel"
                />
              ))}
            </div>
          </div>
        )}

        {!result && currentItem && (
          <section className="rise rise-1 mt-6" aria-labelledby="preview-question">
            <div className="flex items-center justify-between text-[12px] font-bold">
              <span className="text-ink">
                Reto {index + 1} <span className="text-dim">de {items.length}</span>
              </span>
              <span className="text-[#7df0ff]">{progress}%</span>
            </div>

            <div
              className="mt-2.5 grid grid-cols-5 gap-2"
              aria-label={`Progreso: ${index + 1} de ${items.length}`}
            >
              {items.map((item, itemIndex) => (
                <span
                  key={item.code}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    itemIndex < index
                      ? 'bg-[#32d8b5] shadow-[0_0_12px_rgba(50,216,181,0.28)]'
                      : itemIndex === index
                        ? 'bg-gradient-to-r from-[#8271ff] to-[#39c5f3] shadow-[0_0_14px_rgba(111,115,255,0.36)]'
                        : 'bg-[#1b3348]'
                  }`}
                />
              ))}
            </div>

            <div className="mt-5 flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[16px] border border-[#7f85ff]/35 bg-gradient-to-br from-[#6e63ff]/25 to-[#28bfe8]/20 text-[18px] font-black text-white shadow-[0_10px_28px_rgba(61,74,220,0.2)]">
                ✦
              </div>
              <div className="relative flex-1 rounded-[20px] rounded-tl-md border border-white/[0.08] bg-white/[0.045] px-4 py-3">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#8b90ff]">
                  Nova te acompaña
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-dim">{currentSkill.hint}</p>
              </div>
            </div>

            <div
              key={currentItem.code}
              className="rise mt-4 overflow-hidden rounded-[28px] border border-[#55789a]/25 bg-[linear-gradient(145deg,rgba(17,37,58,0.98),rgba(9,25,42,0.98))] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.24)] sm:p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#6f75ff]/25 bg-[#6f75ff]/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#a9adff]">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#7479ff]/20 text-[10px] text-white">
                    {currentSkill.symbol}
                  </span>
                  {currentSkill.label}
                </span>
                <span className="text-[11px] font-bold text-dim">+20 ruta</span>
              </div>
              <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#6f8ca6]">
                Completa la frase
              </p>
              <h2
                id="preview-question"
                className="mt-2 text-[22px] font-extrabold leading-[1.35] tracking-[-0.025em] text-ink sm:text-[25px]"
              >
                {currentItem.prompt}
              </h2>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {currentItem.options.map((option, optionIndex) => {
                const active = selected === optionIndex;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(optionIndex)}
                    className={`group flex min-h-18 items-center gap-3 rounded-[22px] border px-4 py-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7df0ff] active:translate-y-0.5 ${
                      active
                        ? 'border-[#7d83ff] bg-[linear-gradient(135deg,rgba(103,93,255,0.24),rgba(34,174,224,0.16))] shadow-[0_4px_0_#454bb3,0_12px_32px_rgba(65,71,183,0.2)]'
                        : 'border-[#29455e] bg-[#0d2033] shadow-[0_4px_0_#071624] hover:-translate-y-0.5 hover:border-[#4f7595] hover:bg-[#112941]'
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-[13px] border text-[13px] font-black transition-colors ${
                        active
                          ? 'border-[#8d92ff] bg-[#777dff] text-white'
                          : 'border-[#35546d] bg-[#142b40] text-[#8ca8bf] group-hover:text-white'
                      }`}
                    >
                      {active ? <Icon name="check" className="size-4" /> : ANSWER_LETTERS[optionIndex]}
                    </span>
                    <span className={`text-[15px] font-bold leading-snug ${active ? 'text-white' : 'text-ink'}`}>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={selected === null || isSubmitting}
              onClick={next}
              className="btn-gradient mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] px-5 text-[16px] font-extrabold text-white shadow-[0_5px_0_rgba(43,45,131,0.82),0_16px_40px_rgba(77,71,219,0.2)] transition-all enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 disabled:cursor-not-allowed disabled:saturate-50 disabled:opacity-35"
            >
              {isSubmitting
                ? 'Creando tu mapa…'
                : selected === null
                  ? 'Elige una respuesta'
                  : index + 1 === items.length
                    ? 'Ver mi resultado'
                    : 'Confirmar y continuar'}
              {selected !== null && !isSubmitting && <span aria-hidden>→</span>}
            </button>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-[#6f879d]">
              Esto es una orientación breve. Tu ubicación final siempre requiere una evaluación
              completa y revisión humana.
            </p>
          </section>
        )}

        {result && (
          <section className="rise relative mt-6 overflow-hidden rounded-[30px] border border-[#777dff]/25 bg-[radial-gradient(circle_at_top,rgba(105,96,255,0.22),transparent_45%),linear-gradient(145deg,#10263b,#091a2d)] px-6 py-8 text-center shadow-[0_26px_80px_rgba(0,0,0,0.3)] sm:px-8">
            <span className="absolute left-8 top-8 text-[18px] text-[#7df0ff]/55" aria-hidden>
              ✦
            </span>
            <span className="absolute right-9 top-16 text-[13px] text-[#ffd35a]/70" aria-hidden>
              ✦
            </span>
            <div className="mx-auto flex size-16 items-center justify-center rounded-[22px] border border-white/15 bg-gradient-to-br from-[#756cff] to-[#24b8e8] shadow-[0_14px_40px_rgba(57,91,224,0.35)]">
              <span className="text-[30px] text-white" aria-hidden>
                ✦
              </span>
            </div>
            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#7df0ff]">
              Tu mapa inicial está listo
            </p>
            <h2 className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">
              Este es tu punto de partida
            </h2>
            <div className="mx-auto mt-5 flex size-32 flex-col items-center justify-center rounded-full border border-[#8a8fff]/35 bg-[#0b1c31]/85 shadow-[inset_0_0_34px_rgba(109,102,255,0.18),0_0_45px_rgba(55,131,228,0.16)]">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dim">
                Nivel
              </span>
              <span className="text-[52px] font-black leading-none tracking-tight text-[#8c91ff]">
                {result.band}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Chip tone="ok">Fortaleza · {result.strength}</Chip>
              <Chip tone="warn">Por reforzar · {result.gap}</Chip>
            </div>
            <p className="mx-auto mt-5 max-w-[42ch] text-[13px] leading-relaxed text-dim">
              {result.message}
            </p>
            <Link
              href={`/${locale}/register`}
              className="btn-gradient mt-6 flex min-h-14 w-full items-center justify-center rounded-[20px] px-5 text-[16px] font-extrabold text-white shadow-[0_5px_0_rgba(43,45,131,0.82)]"
            >
              Crear la cuenta familiar
            </Link>
          </section>
        )}

        <p className="mt-5 text-center">
          <Link
            href={`/${locale}/login`}
            className="text-[13px] font-bold text-[#858aff] transition-colors hover:text-[#aeb1ff]"
          >
            Ya tengo cuenta
          </Link>
        </p>
      </main>
    </PublicShell>
  );
}
