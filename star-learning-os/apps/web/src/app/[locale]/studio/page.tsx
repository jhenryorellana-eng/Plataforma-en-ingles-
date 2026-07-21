'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { clientApi } from '@/lib/client-api';
import { Card, Chip, Group, Icon, IconTile, SectionHeader, StarMark, Wordmark, type IconName } from '@/components/ui';

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

interface StudioActivity {
  id: string;
  code: string;
  kind: string;
  skill: string;
  isTransferVariant: boolean;
  prompt: Record<string, unknown>;
  answerKey: Record<string, unknown>;
}

interface LessonDetail {
  id: string;
  code: string;
  unit: { code: string; name: string };
  objective: string;
  status: 'draft' | 'published' | 'retired';
  sourceTopic: string | null;
  competencies: Array<{ code: string; descriptor: string; skill: string }>;
  activities: StudioActivity[];
}

const KIND_META: Record<string, { label: string; icon: IconName; color: string }> = {
  mcq: { label: 'Opción múltiple', icon: 'check', color: 'bg-blue' },
  gap_fill: { label: 'Completar espacios', icon: 'pencil', color: 'bg-teal' },
  writing_prompt: { label: 'Escritura', icon: 'book', color: 'bg-primary' },
  voice_mission: { label: 'Misión de voz', icon: 'mic', color: 'bg-gold' },
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
      document.getElementById('revision')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-2.5">
          <Wordmark />
          <Link href={`/${locale}/staff`} className="text-[15px] font-semibold text-primary">
            Consola académica
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-20 pt-7">
        <div className="rise mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wide text-dim">
              Dashboard del docente
            </p>
            <h1 className="mt-0.5 text-[38px] font-extrabold leading-tight tracking-tight text-ink">
              Estudio de <span className="text-gradient">contenido</span>
            </h1>
            <p className="mt-1 max-w-[52ch] text-[15px] leading-relaxed text-dim">
              Tú pones el tema; la IA redacta la clase completa con la Metodología STAR. Nada llega
              al alumno sin revisión y publicación de otra persona autorizada.
            </p>
          </div>
          <Chip tone={overview?.authoringProvider === 'template-authoring' ? 'warn' : 'ok'}>
            {overview?.authoringProvider === 'template-authoring'
              ? 'Autor IA: plantillas (configura OPENAI_TEXT_MODEL)'
              : 'Autor IA: OpenAI activo'}
          </Chip>
        </div>

        {overview && (
          <div className="rise rise-1 mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon="check"
              color="bg-ok"
              label="Clases publicadas"
              value={String(overview.stats.publishedLessons)}
            />
            <StatCard
              icon="pencil"
              color="bg-gold"
              label="Borradores"
              value={String(overview.stats.draftLessons)}
            />
            <StatCard
              icon="route"
              color="bg-primary"
              label="Competencias cubiertas"
              value={`${overview.stats.competenciesCovered}/${overview.stats.competenciesTotal}`}
            />
            <StatCard
              icon="progress"
              color="bg-blue"
              label="Versión del programa"
              value={overview.program.version.split('-')[0]}
            />
          </div>
        )}

        <section className="rise rise-2 mb-8">
          <div className="frame-animated shadow-[0_18px_44px_rgba(94,92,230,0.2)]">
            <div className="relative overflow-hidden rounded-[22px] bg-surface px-6 py-6">
              <StarMark className="star-float pointer-events-none absolute -right-8 -top-10 size-40 text-primary/8" />
              <p className="text-[17px] font-bold text-ink">Sugerir un tema para una nueva clase</p>
              <p className="mt-0.5 text-[13px] text-dim">
                El tema es el contexto: la lección enseña las competencias del mapa oficial. El
                estándar no cambia.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <input
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Ej.: El club de robótica, Un viaje escolar a Cusco, La feria de ciencias…"
                  className="rounded-xl bg-mist px-4 py-3.5 text-[16px] text-ink placeholder:text-dim/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                  className="btn-gradient flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[16px] font-bold text-white disabled:opacity-40"
                >
                  <StarMark className="size-4 text-white" />
                  {generating ? 'La IA está redactando tu clase…' : 'Generar clase con IA'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {detail && (
          <section id="revision" className="rise mb-8 scroll-mt-20">
            <SectionHeader>Revisión del borrador</SectionHeader>
            <Card className="overflow-hidden">
              <div className="border-b border-line bg-mist/50 px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-wide text-dim">
                      {detail.unit.name} · {detail.code}
                      {detail.sourceTopic ? ` · Tema: ${detail.sourceTopic}` : ''}
                    </p>
                    <p className="mt-1.5 text-[19px] font-bold leading-snug text-ink">
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
              </div>

              <div className="flex flex-col gap-4 px-6 py-5">
                {detail.activities.map((activity, index) => (
                  <ActivityPreview key={activity.id} activity={activity} index={index} />
                ))}
              </div>

              {detail.status === 'draft' && (
                <div className="flex gap-3 border-t border-line px-6 py-4">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide('publish')}
                    className="flex-1 rounded-2xl bg-ok py-3 text-[16px] font-bold text-white shadow-[0_8px_20px_rgba(47,191,95,0.3)] transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Aprobar y publicar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide('retire')}
                    className="flex-1 rounded-2xl bg-risk-soft py-3 text-[16px] font-bold text-risk transition-opacity hover:opacity-80 disabled:opacity-40"
                  >
                    Descartar
                  </button>
                </div>
              )}
              {detail.status === 'published' && (
                <p className="border-t border-line px-6 py-4 text-[14px] font-semibold text-ok-deep">
                  ✓ Publicada: ya aparece en la ruta de los alumnos.
                </p>
              )}
            </Card>
          </section>
        )}

        <section className="rise rise-3">
          <SectionHeader>Temario actual</SectionHeader>
          <div className="flex flex-col gap-5">
            {overview?.units.map((unit) => (
              <div key={unit.code}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className="grad-brand inline-flex size-6 items-center justify-center rounded-lg">
                    <StarMark className="size-3 text-white" />
                  </span>
                  <p className="text-[16px] font-bold text-ink">{unit.name}</p>
                  <span className="text-[12px] font-medium text-dim">{unit.code}</span>
                </div>
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
                          {lesson.createdBy.startsWith('ai:') ? 'Autor: IA + revisión docente' : 'Autor: equipo'}
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
                      <Icon name="chevron" className="size-4 shrink-0 text-[#c3c3d1]" />
                    </button>
                  ))}
                </Group>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl bg-risk-soft px-4 py-3 text-center text-[14px] text-risk">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
}: {
  icon: IconName;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="lift flex items-center gap-3 px-4 py-4">
      <IconTile name={icon} color={color} />
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-dim">{label}</p>
        <p className="text-[22px] font-extrabold leading-tight tabular-nums text-ink">{value}</p>
      </div>
    </Card>
  );
}

/** Vista legible de cada actividad: el docente revisa contenido, no JSON. */
function ActivityPreview({ activity, index }: { activity: StudioActivity; index: number }) {
  const meta = KIND_META[activity.kind] ?? KIND_META.mcq;
  const prompt = activity.prompt as {
    instructions?: string;
    transcript?: string;
    stem?: string;
    options?: string[];
    text?: string;
    hints?: string[];
    scenario?: string;
    minWords?: number;
    objective?: string;
    openingLine?: string;
    vocabulary?: string[];
    mockScript?: string[];
  };
  const answerKey = activity.answerKey as {
    correctIndex?: number;
    explanation?: string;
    accepted?: string[][];
    rubricSpec?: { minWords?: number; requiredElements?: string[] };
  };

  return (
    <div className="rounded-2xl border border-line bg-paper/60 px-4 py-4">
      <div className="flex items-center gap-3">
        <IconTile name={meta.icon} color={meta.color} />
        <div className="flex-1">
          <p className="text-[14px] font-bold text-ink">
            {index + 1}. {meta.label}
            {activity.isTransferVariant && (
              <span className="ml-2 text-[11px] font-bold uppercase tracking-wide text-teal">
                Transferencia
              </span>
            )}
          </p>
          <p className="text-[12px] text-dim">{activity.skill}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-[14px] leading-relaxed">
        {prompt.instructions && <p className="text-dim">{prompt.instructions}</p>}
        {prompt.transcript && (
          <p className="rounded-xl bg-surface px-3.5 py-2.5 text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            “{prompt.transcript}”
          </p>
        )}
        {prompt.stem && <p className="font-semibold text-ink">{prompt.stem}</p>}
        {prompt.options && (
          <ul className="flex flex-col gap-1">
            {prompt.options.map((option, optionIndex) => (
              <li
                key={option}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
                  optionIndex === answerKey.correctIndex
                    ? 'bg-ok-soft font-semibold text-ok-deep'
                    : 'text-dim'
                }`}
              >
                {optionIndex === answerKey.correctIndex && <Icon name="check" className="size-4" />}
                {option}
              </li>
            ))}
          </ul>
        )}
        {answerKey.explanation && (
          <p className="text-[13px] text-dim">
            <span className="font-semibold text-ink">Explicación:</span> {answerKey.explanation}
          </p>
        )}
        {prompt.text && (
          <p className="rounded-xl bg-surface px-3.5 py-2.5 text-ink shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {prompt.text}
          </p>
        )}
        {answerKey.accepted && (
          <p className="text-[13px] text-dim">
            <span className="font-semibold text-ink">Respuestas aceptadas:</span>{' '}
            {answerKey.accepted.map((group) => group.join(' / ')).join(' · ')}
          </p>
        )}
        {prompt.scenario && (
          <p className="text-dim">
            <span className="font-semibold text-ink">Escenario:</span> {prompt.scenario}
          </p>
        )}
        {answerKey.rubricSpec && (
          <p className="text-[13px] text-dim">
            <span className="font-semibold text-ink">Rúbrica:</span> mínimo{' '}
            {answerKey.rubricSpec.minWords} palabras
            {answerKey.rubricSpec.requiredElements?.length
              ? ` · debe incluir: ${answerKey.rubricSpec.requiredElements.join(', ')}`
              : ''}
          </p>
        )}
        {prompt.openingLine && (
          <p className="text-dim">
            <span className="font-semibold text-ink">El Mentor abre con:</span> “{prompt.openingLine}”
          </p>
        )}
        {prompt.vocabulary && prompt.vocabulary.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {prompt.vocabulary.map((word) => (
              <Chip key={word} tone="primary">
                {word}
              </Chip>
            ))}
          </div>
        )}
        {prompt.mockScript && prompt.mockScript.length > 0 && (
          <details className="rounded-xl bg-surface px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <summary className="cursor-pointer text-[13px] font-semibold text-primary">
              Guion del interlocutor ({prompt.mockScript.length} turnos)
            </summary>
            <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-[13px] text-dim">
              {prompt.mockScript.map((line, lineIndex) => (
                <li key={lineIndex}>{line}</li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}
