'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import type { PreviewEstimateResponse } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { AppIcon, Card, Chip, Group, Icon } from '@/components/ui';
import { PublicShell } from '@/components/public-shell';

interface PreviewItem {
  code: string;
  skill: string;
  prompt: string;
  options: string[];
}

export default function PreviewPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ itemCode: string; selectedIndex: number }>>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<PreviewEstimateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    try {
      setResult(
        await clientApi<PreviewEstimateResponse>('/preview/estimate', {
          method: 'POST',
          body: JSON.stringify({ answers: updated }),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo estimar tu nivel');
    }
  }

  return (
    <PublicShell>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-12">
      <div className="rise flex flex-col items-center text-center">
        <AppIcon className="size-14" />
        <h1 className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          StarMap Preview
        </h1>
        <p className="mt-1.5 max-w-[34ch] text-[14px] leading-relaxed text-dim">
          Un vistazo de 3 minutos, sin registro. No decide tu ubicación: eso lo hace el StarMap
          completo con revisión humana.
        </p>
      </div>

      {error && (
        <div className="rise mt-6 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
          {error}
        </div>
      )}

      {!result && items.length > 0 && (
        <div className="rise rise-1 mt-7 flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            {items.map((item, itemIndex) => (
              <span
                key={item.code}
                className={`h-[5px] flex-1 rounded-full ${
                  itemIndex < index ? 'bg-ok' : itemIndex === index ? 'bg-primary' : 'bg-fill'
                }`}
              />
            ))}
          </div>
          <Card className="px-5 py-4">
            <p className="text-[16px] leading-relaxed text-ink">{items[index].prompt}</p>
          </Card>
          <Group>
            {items[index].options.map((option, optionIndex) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelected(optionIndex)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-mist/60"
              >
                <span className="flex-1 text-[15px] text-ink">{option}</span>
                {selected === optionIndex && <Icon name="check" className="size-5 text-primary" />}
              </button>
            ))}
          </Group>
          <button
            type="button"
            disabled={selected === null}
            onClick={next}
            className="btn-gradient w-full rounded-2xl py-3.5 text-[17px] font-semibold text-white disabled:opacity-35"
          >
            {index + 1 === items.length ? 'Ver mi resultado' : 'Siguiente'}
          </button>
        </div>
      )}

      {result && (
        <Card className="rise mt-7 flex flex-col items-center gap-3 px-6 py-8 text-center">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
            Tu nivel orientativo
          </p>
          <p className="text-[56px] font-extrabold leading-none tracking-tight text-primary">
            {result.band}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            <Chip tone="ok">Fortaleza: {result.strength}</Chip>
            <Chip tone="warn">Por reforzar: {result.gap}</Chip>
          </div>
          <p className="max-w-[36ch] text-[13px] leading-relaxed text-dim">{result.message}</p>
          <Link
            href={`/${locale}/register`}
            className="btn-gradient mt-2 w-full rounded-2xl py-3.5 text-center text-[17px] font-semibold text-white"
          >
            Crear la cuenta familiar y empezar
          </Link>
        </Card>
      )}

      <p className="mt-6 text-center">
        <Link href={`/${locale}/login`} className="text-[14px] font-medium text-primary">
          Ya tengo cuenta
        </Link>
      </p>
      </main>
    </PublicShell>
  );
}
