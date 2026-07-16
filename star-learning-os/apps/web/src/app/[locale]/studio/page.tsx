'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { clientApi } from '@/lib/client-api';
import { Card, Chip, Group, Icon, SectionHeader, Wordmark } from '@/components/ui';

interface StudioOverview {
  program: { code: string; version: string };
  authoringProvider: string;
  stats: {
    publishedLessons: number;
    draftLessons: number;
    competenciesTotal: number;
    competenciesCovered: number;
  };
  units: Array<{
    code: string;
    name: string;
    lessons: Array<{
      id: string;
      code: string;
      objective: string;
      status: 'draft' | 'published' | 'retired';
      sourceTopic: string | null;
      createdBy: string;
      activityCount: number;
    }>;
  }>;
}

interface LessonDetail {
  id: string;
  code: string;
  unit: { code: string; name: string };
  objective: string;
  status: 'draft' | 'published' | 'retired';
  sourceTopic: string | null;
  competencies: Array<{ code: string; descriptor: string; skill: string }>;
  activities: Array<{
    id: string;
    code: string;
    kind: string;
    skill: string;
    isTransferVariant: boolean;
    prompt: Record<string, unknown>;
    answerKey: Record<string, unknown>;
  }>;
}

const KIND_LABELS: Record<string, string> = {
  mcq: 'Opción múltiple',
  gap_fill: 'Completar espacios',
  writing_prompt: 'Escritura',
  voice_mission: 'Misión de voz',
};

export default function StudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [overview, setOverview] = useState<StudioOverview | null>(null);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setOverview(await clientApi<StudioOverview>('/studio/overview'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el estudio');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const draft = await clientApi<LessonDetail>('/studio/lesson-drafts', {
        method: 'POST',
        body: JSON.stringify({ topic, ...(notes ? { notes } : {}) }),
      });
      setDetail(draft);
      setTopic('');
      setNotes('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el borrador');
    } finally {
      setGenerating(false);
    }
  }

  async function openLesson(id: string) {
    setError(null);
    try {
      setDetail(await clientApi<LessonDetail>(`/studio/lessons/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la lección');
    }
  }

  async function decide(action: 'publish' | 'retire') {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      setDetail(
        await clientApi<LessonDetail>(`/studio/lessons/${detail.id}/decision`, {
          method: 'POST',
          body: JSON.stringify({ action }),
        }),
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la decisión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="material-bar sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
          <Wordmark />
          <Link href={`/${locale}/staff`} className="text-[15px] font-medium text-primary">
            Consola académica
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <div className="rise mb-6">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
            Dashboard del docente
          </p>
          <h1 className="mt-0.5 text-[34px] font-extrabold leading-tight tracking-tight text-ink">
            Estudio de contenido
          </h1>
          <p className="mt-1 text-[15px] leading-relaxed text-dim">
            Tú sugieres el tema; la IA redacta la lección completa con la Metodología STAR. Nada
            llega al alumno sin tu publicación.
          </p>
        </div>

        {overview && (
          <div className="rise rise-1 mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="px-4 py-3.5">
              <p className="text-[12px] text-dim">Publicadas</p>
              <p className="text-[26px] font-extrabold tabular-nums text-ink">
                {overview.stats.publishedLessons}
              </p>
            </Card>
            <Card className="px-4 py-3.5">
              <p className="text-[12px] text-dim">Borradores</p>
              <p className="text-[26px] font-extrabold tabular-nums text-ink">
                {overview.stats.draftLessons}
              </p>
            </Card>
            <Card className="px-4 py-3.5">
              <p className="text-[12px] text-dim">Competencias cubiertas</p>
              <p className="text-[26px] font-extrabold tabular-nums text-ink">
                {overview.stats.competenciesCovered}
                <span className="text-[15px] font-semibold text-dim">
                  {' '}
                  / {overview.stats.competenciesTotal}
                </span>
              </p>
            </Card>
            <Card className="px-4 py-3.5">
              <p className="text-[12px] text-dim">Autor IA</p>
              <p className="mt-1 text-[13px] font-semibold leading-tight text-ink">
                {overview.authoringProvider === 'template-authoring'
                  ? 'Plantillas (sin API key)'
                  : 'OpenAI'}
              </p>
            </Card>
          </div>
        )}

        <section className="rise rise-2 mb-7">
          <SectionHeader>Sugerir un tema para una nueva clase</SectionHeader>
          <Card className="flex flex-col gap-3 px-5 py-5">
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ej.: El club de robótica, Un viaje escolar a Cusco, La feria de ciencias…"
              className="rounded-xl bg-mist px-4 py-3 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas opcionales para el autor IA (enfoque, vocabulario, tono…)"
              className="rounded-xl bg-mist px-4 py-3 text-[14px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="button"
              disabled={generating || topic.trim().length < 3}
              onClick={generate}
              className="rounded-2xl bg-primary py-3 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-35"
            >
              {generating ? 'La IA está redactando tu lección…' : 'Generar lección con IA'}
            </button>
            <p className="text-[12px] leading-relaxed text-dim">
              El tema es el contexto: la lección enseña las competencias del mapa oficial (el
              estándar no cambia). Se crea como borrador para tu revisión.
            </p>
          </Card>
        </section>

        {detail && (
          <section className="rise mb-7">
            <SectionHeader>Revisión del borrador</SectionHeader>
            <Card className="px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-dim">
                    {detail.unit.name} · {detail.code}
                    {detail.sourceTopic ? ` · Tema: ${detail.sourceTopic}` : ''}
                  </p>
                  <p className="mt-1 text-[17px] font-semibold leading-snug text-ink">
                    {detail.objective}
                  </p>
                </div>
                <Chip
                  tone={
                    detail.status === 'published' ? 'ok' : detail.status === 'draft' ? 'warn' : 'default'
                  }
                >
                  {detail.status === 'published'
                    ? 'Publicada'
                    : detail.status === 'draft'
                      ? 'Borrador'
                      : 'Retirada'}
                </Chip>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {detail.competencies.map((competency) => (
                  <Chip key={competency.code} tone="primary">
                    {competency.code}
                  </Chip>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {detail.activities.map((activity) => (
                  <div key={activity.id} className="rounded-xl bg-mist px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-ink">
                        {KIND_LABELS[activity.kind] ?? activity.kind}
                        {activity.isTransferVariant ? ' · Transferencia' : ''}
                      </p>
                      <span className="text-[12px] text-dim">{activity.skill}</span>
                    </div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[12px] leading-relaxed text-dim">
                      {JSON.stringify({ prompt: activity.prompt, answerKey: activity.answerKey }, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>

              {detail.status === 'draft' && (
                <div className="mt-4 flex gap-3 border-t border-line pt-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide('publish')}
                    className="flex-1 rounded-2xl bg-ok py-3 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Aprobar y publicar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide('retire')}
                    className="flex-1 rounded-2xl bg-risk-soft py-3 text-[16px] font-semibold text-risk transition-opacity hover:opacity-80 disabled:opacity-40"
                  >
                    Descartar
                  </button>
                </div>
              )}
              {detail.status === 'published' && (
                <p className="mt-4 border-t border-line pt-3 text-[13px] text-ok-deep">
                  Publicada: ya aparece en la ruta de los alumnos.
                </p>
              )}
            </Card>
          </section>
        )}

        <section className="rise rise-3">
          <SectionHeader>Temario actual</SectionHeader>
          <div className="flex flex-col gap-4">
            {overview?.units.map((unit) => (
              <div key={unit.code}>
                <p className="mb-2 px-1 text-[15px] font-bold text-ink">
                  {unit.code} · {unit.name}
                </p>
                <Group>
                  {unit.lessons.map((lesson) => (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => openLesson(lesson.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-mist/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] text-ink">{lesson.objective}</p>
                        <p className="text-[12px] text-dim">
                          {lesson.activityCount} actividades ·{' '}
                          {lesson.createdBy.startsWith('ai:') ? 'Autor: IA' : 'Autor: equipo'}
                          {lesson.sourceTopic ? ` · Tema: ${lesson.sourceTopic}` : ''}
                        </p>
                      </div>
                      <Chip
                        tone={
                          lesson.status === 'published'
                            ? 'ok'
                            : lesson.status === 'draft'
                              ? 'warn'
                              : 'default'
                        }
                      >
                        {lesson.status === 'published'
                          ? 'Publicada'
                          : lesson.status === 'draft'
                            ? 'Borrador'
                            : 'Retirada'}
                      </Chip>
                      <Icon name="chevron" className="size-4 shrink-0 text-[#c7c7cc]" />
                    </button>
                  ))}
                </Group>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
