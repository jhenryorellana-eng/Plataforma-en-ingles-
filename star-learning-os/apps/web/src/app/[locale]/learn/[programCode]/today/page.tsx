import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { MeResponse, TodayBlock, TodayResponse } from '@star/contracts';
import { apiFetch } from '@/lib/api';
import { resolveEnrollment } from '@/lib/enrollment';
import { Icon, type IconName } from '@/components/ui';
import { AuroraHero, AuroraSurface } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';
import { StartLessonButton } from '@/components/start-lesson-button';

const BLOCK_META: Record<
  TodayBlock['kind'],
  { eyebrow: string; icon: IconName; tone: string; fallbackPath: 'voice' | 'review' | 'today' }
> = {
  lesson: {
    eyebrow: 'Aprender',
    icon: 'today',
    tone: 'bg-primary-soft text-primary-deep',
    fallbackPath: 'today',
  },
  voice_mission: {
    eyebrow: 'Hablar con Nova',
    icon: 'mic',
    tone: 'bg-teal/15 text-teal',
    fallbackPath: 'voice',
  },
  review: {
    eyebrow: 'Recuperar',
    icon: 'review',
    tone: 'bg-gold-soft text-gold-deep',
    fallbackPath: 'review',
  },
};

function MissionStep({
  block,
  index,
  locale,
  programCode,
}: {
  block: TodayBlock;
  index: number;
  locale: string;
  programCode: string;
}) {
  const meta = BLOCK_META[block.kind];
  // `block.href` apunta al endpoint REST; la app siempre navega por su ruta de interfaz.
  const href = `/${locale}/learn/${programCode}/${meta.fallbackPath}`;

  return (
    <Link
      href={href}
      className="mission-choice group flex items-center gap-3.5 rounded-[20px] px-3.5 py-3.5 sm:px-4"
    >
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${meta.tone}`}>
        <Icon name={meta.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mission-kicker block text-[9px] text-dim">
          Misión {index + 1} · {meta.eyebrow}
        </span>
        <span className="mt-0.5 block text-[15px] font-bold leading-snug text-ink">
          {block.title}
        </span>
        <span className="mt-0.5 line-clamp-1 block text-[12px] text-dim">
          {block.description}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[11px] font-bold tabular-nums text-dim">{block.estimatedMinutes} min</span>
        <Icon name="chevron" className="size-4 text-dim transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function PrimaryMissionAction({
  block,
  locale,
  programCode,
}: {
  block: TodayBlock;
  locale: string;
  programCode: string;
}) {
  const meta = BLOCK_META[block.kind];
  const href = `/${locale}/learn/${programCode}/${meta.fallbackPath}`;
  const action =
    block.kind === 'review'
      ? 'Recuperar ahora'
      : block.kind === 'voice_mission'
        ? 'Hablar con Nova'
        : 'Revisar misión';

  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-[13px] font-extrabold text-[#293aa8] shadow-[0_4px_0_rgba(2,10,22,0.62)] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
    >
      <Icon name={meta.icon} className="size-4" />
      <span>{action}</span>
      <Icon name="arrow" className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function SignalCard({
  icon,
  label,
  value,
  tone,
  surfaceTone,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone: string;
  surfaceTone: 'blue' | 'cyan' | 'gold';
}) {
  return (
    <AuroraSurface tone={surfaceTone} className="h-full px-3 py-3.5 sm:px-4">
      <span className={`flex size-8 items-center justify-center rounded-xl ${tone}`}>
        <Icon name={icon} className="size-4" />
      </span>
      <p className="mt-3 text-[17px] font-extrabold leading-none tabular-nums text-ink">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-dim">{label}</p>
    </AuroraSurface>
  );
}

export default async function TodayPage({
  params,
}: {
  params: Promise<{ locale: string; programCode: string }>;
}) {
  const { locale, programCode } = await params;
  const resolution = await resolveEnrollment(programCode);
  if (resolution.kind === 'anonymous') redirect(`/${locale}/login`);
  if (resolution.kind === 'no-enrollment') redirect(`/${locale}/enroll`);
  const enrollment = resolution.enrollment;
  if (enrollment.status === 'pending_diagnostic') {
    redirect(`/${locale}/learn/${programCode}/diagnostic`);
  }
  if (!enrollment.paceConfirmed) redirect(`/${locale}/learn/${programCode}/pace`);

  const [me, today] = await Promise.all([
    apiFetch<MeResponse>('/auth/me'),
    apiFetch<TodayResponse>(`/enrollments/${enrollment.id}/today`),
  ]);

  const firstName = me.displayName.split(' ')[0];
  const dateLabel = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Lima',
  });
  const primaryBlock = today.blocks[0];
  const secondaryBlocks = today.blocks.filter((block) => block !== primaryBlock);
  const totalMinutes = today.blocks.reduce((sum, block) => sum + block.estimatedMinutes, 0);
  const voiceRatio: number | null =
    today.voice.includedMinutes === 0
      ? null
      : Math.min(1, today.voice.usedMinutes / today.voice.includedMinutes);
  const trajectoryLabel =
    today.trajectoryStatus === 'on_track'
      ? 'En ruta'
      : today.trajectoryStatus === 'at_risk'
        ? 'Atención'
        : 'Reajustar';
  const trajectoryTone =
    today.trajectoryStatus === 'on_track'
      ? 'text-ok-deep'
      : today.trajectoryStatus === 'at_risk'
        ? 'text-warn'
        : 'text-risk';

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="rise">
        <AuroraHero
          asset="today"
          eyebrow={`${dateLabel} · ${primaryBlock ? 'Misión 1' : 'Órbita despejada'}`}
          title={primaryBlock?.title ?? `Hola, ${firstName}`}
          body={
            primaryBlock ? (
              <>
                Hola, {firstName}. {primaryBlock.description} · {primaryBlock.estimatedMinutes} min
              </>
            ) : (
              <>Completaste lo importante por hoy. Tu ruta seguirá esperándote cuando vuelvas.</>
            )
          }
          badge={
            <span className="rounded-full border border-white/15 bg-[#071525]/75 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg backdrop-blur-md">
              {trajectoryLabel}
            </span>
          }
          tone="cyan"
          priority
          imageAlt="Estudiante acompañada por Nova ante dos portales de aprendizaje"
        >
          {primaryBlock?.kind === 'lesson' && primaryBlock.lessonContractId ? (
            <div className="inline-flex rounded-2xl bg-white px-1 shadow-[0_4px_0_rgba(2,10,22,0.62)] [&_button]:min-h-11 [&_button]:px-4 [&_button]:py-2.5 [&_button]:font-extrabold [&_button]:text-[#293aa8] [&_button:hover]:bg-[#eef1ff]">
              <StartLessonButton
                locale={locale}
                programCode={programCode}
                enrollmentId={enrollment.id}
                lessonContractId={primaryBlock.lessonContractId}
                label="Comenzar misión"
                compact
              />
            </div>
          ) : primaryBlock ? (
            <PrimaryMissionAction block={primaryBlock} locale={locale} programCode={programCode} />
          ) : null}
        </AuroraHero>
      </div>

      <div className="rise rise-1">
        <NovaGuide
          compact
          state={today.blocks.length === 0 ? 'celebrate' : 'idle'}
          eyebrow={`Nova · plan para ${firstName}`}
        >
          {today.blocks.length === 0
            ? 'Todo está al día. Descansar también forma parte de una buena expedición.'
            : `${today.blocks.length} ${today.blocks.length === 1 ? 'misión' : 'misiones'} y unos ${totalMinutes} minutos te separan de la meta de hoy.`}
        </NovaGuide>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)] lg:items-start lg:gap-8">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="mission-kicker text-[10px] text-primary-deep">Siguientes paradas</p>
              <p className="mt-0.5 text-[13px] text-dim">
                {secondaryBlocks.length > 0
                  ? `${secondaryBlocks.length} ${secondaryBlocks.length === 1 ? 'misión adicional' : 'misiones adicionales'}`
                  : 'Sin tareas adicionales pendientes'}
              </p>
            </div>
            <div className="flex items-center gap-1.5" aria-label={`${today.blocks.length} misiones para hoy`}>
              {today.blocks.map((block, index) => (
                <span
                  key={`${block.kind}-${index}`}
                  className={`h-2 rounded-full ${index === 0 ? 'w-8 bg-primary' : 'w-2 bg-fill'}`}
                />
              ))}
            </div>
          </div>

          {secondaryBlocks.length > 0 && (
            <div className="rise rise-2 flex flex-col gap-3">
              {secondaryBlocks.map((block, index) => (
                <MissionStep
                  key={`${block.kind}-${block.title}`}
                  block={block}
                  index={index + 1}
                  locale={locale}
                  programCode={programCode}
                />
              ))}
            </div>
          )}
          {secondaryBlocks.length === 0 && (
            <AuroraSurface tone="cyan" className="rise rise-2 flex items-center gap-3.5 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ok-soft text-ok-deep">
                <Icon name="check" className="size-5" />
              </span>
              <div>
                <p className="text-[14px] font-extrabold text-ink">Sector despejado</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-dim">
                  Completa tu misión principal y vuelve mañana para recibir una nueva ruta.
                </p>
              </div>
            </AuroraSurface>
          )}
        </section>

        <aside className="flex flex-col gap-5">
          <section className="rise rise-2">
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="mission-kicker text-[10px] text-dim">Señales de vuelo</p>
              <span className={`text-[11px] font-bold ${trajectoryTone}`}>{trajectoryLabel}</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5 lg:grid-cols-1">
              <SignalCard
                icon="today"
                label="Meta semanal"
                value={`${today.weeklyGoalHours} h`}
                tone="bg-primary-soft text-primary-deep"
                surfaceTone="blue"
              />
              <SignalCard
                icon="mic"
                label="Voz usada"
                value={voiceRatio === null ? '—' : `${Math.round(voiceRatio * 100)}%`}
                tone="bg-teal/15 text-teal"
                surfaceTone="cyan"
              />
              <SignalCard
                icon="review"
                label="Repasos"
                value={`${today.dueReviews}`}
                tone="bg-gold-soft text-gold-deep"
                surfaceTone="gold"
              />
            </div>
          </section>

          <Link
            href={`/${locale}/learn/${programCode}/path`}
            className="mission-panel rise rise-3 group rounded-[24px] p-4 transition-colors hover:bg-mist/80"
          >
            <div className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue/15 text-blue">
                <Icon name="route" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="mission-kicker block text-[9px] text-dim">Próxima puerta</span>
                <span className="mt-1 block text-[14px] font-bold leading-snug text-ink">
                  {today.nextMilestone}
                </span>
              </span>
              <Icon name="arrow" className="mt-1 size-4 text-primary transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          {today.voice.includedMinutes === 0 ? (
            <p className="px-2 text-[11px] leading-relaxed text-dim">
              Tu plan actual no incluye minutos de voz esta semana.
            </p>
          ) : today.voice.alertLevel !== null && (
            <p className="px-2 text-[11px] leading-relaxed text-dim">
              Uso de voz al {Math.round(today.voice.alertLevel * 100)}%. El aviso también está disponible para tu apoderado.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
