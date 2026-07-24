'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Icon, IconTile, type IconName } from './ui';

interface StaffTutorialProps {
  staffId: string;
  canReview: boolean;
  canAuthor: boolean;
  canSafeguard: boolean;
}

interface TutorialStep {
  eyebrow: string;
  title: string;
  description: string;
  target?: string;
  icon: IconName;
  color: string;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const WELCOME_STEP: TutorialStep = {
  eyebrow: 'Bienvenida',
  title: 'Tu panel, explicado en menos de un minuto',
  description:
    'Te mostraremos dónde mirar y qué hacer. El aprendizaje continúa automáticamente; tú intervienes solamente cuando tu criterio es necesario.',
  icon: 'route',
  color: 'bg-primary',
};

function buildSteps({
  canReview,
  canAuthor,
  canSafeguard,
}: Omit<StaffTutorialProps, 'staffId'>): TutorialStep[] {
  const steps: TutorialStep[] = [
    WELCOME_STEP,
    {
      eyebrow: 'Paso 1',
      title: 'Empieza por el resumen del día',
      description:
        'Estas tarjetas te dicen cuántos alumnos, resultados y actividades necesitan una mirada. Si todo está en cero, no tienes pendientes.',
      target: '[data-staff-tour="summary"]',
      icon: 'today',
      color: 'bg-blue',
    },
  ];

  if (canReview) {
    steps.push(
      {
        eyebrow: `Paso ${steps.length}`,
        title: 'Resuelve primero “Qué hacer hoy”',
        description:
          'Aquí aparecen resultados que todavía no son definitivos. Lee la explicación y confirma o invalida solamente después de revisarla.',
        target: '[data-staff-tour="reviews"]',
        icon: 'review',
        color: 'bg-gold',
      },
      {
        eyebrow: `Paso ${steps.length + 1}`,
        title: 'Acompaña sin revisar todo',
        description:
          'En Alumnos verás quién avanza bien y quién necesita apoyo. Cada tarjeta propone una acción breve y comprensible.',
        target: '[data-staff-tour="learners"]',
        icon: 'progress',
        color: 'bg-ok',
      },
    );
  }

  if (canAuthor) {
    steps.push({
      eyebrow: `Paso ${steps.length}`,
      title: 'Prepara actividades cuando sea necesario',
      description:
        'Desde aquí puedes abrir el espacio de actividades. El contenido siempre se revisa antes de llegar a los alumnos.',
      target: '[data-staff-tour="activities"]',
      icon: 'book',
      color: 'bg-primary',
    });
  }

  if (canSafeguard) {
    steps.push({
      eyebrow: `Paso ${steps.length}`,
      title: 'Las alertas están separadas del progreso',
      description:
        'Solo el personal autorizado ve esta sección. Atiende primero las alertas prioritarias y consulta únicamente la información necesaria.',
      target: '[data-staff-tour="alerts"]',
      icon: 'shield',
      color: 'bg-risk',
    });
  }

  return steps;
}

export function StaffTutorial({
  staffId,
  canReview,
  canAuthor,
  canSafeguard,
}: StaffTutorialProps) {
  const storageKey = `star:staff-tutorial:v1:${staffId}`;
  const steps = useMemo(
    () => buildSteps({ canReview, canAuthor, canSafeguard }),
    [canAuthor, canReview, canSafeguard],
  );
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<HighlightRect | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>(undefined);
  const dialogRef = useRef<HTMLDivElement>(null);
  const activeStep = steps[stepIndex] ?? steps[0];
  const isLastStep = stepIndex === steps.length - 1;

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey) !== 'complete') setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        try {
          window.localStorage.setItem(storageKey, 'complete');
        } catch {
          // El tutorial sigue siendo descartable aunque el navegador bloquee storage.
        }
        setOpen(false);
      }
    }

    document.addEventListener('keydown', closeWithEscape);
    return () => document.removeEventListener('keydown', closeWithEscape);
  }, [open, stepIndex, storageKey]);

  useEffect(() => {
    if (!open || !activeStep.target) {
      setHighlight(null);
      setPanelStyle(undefined);
      return;
    }

    const target = document.querySelector<HTMLElement>(activeStep.target);
    if (!target) {
      setHighlight(null);
      setPanelStyle(undefined);
      return;
    }
    const targetElement = target;

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    function updatePosition() {
      const rect = targetElement.getBoundingClientRect();
      const padding = 8;
      const panelWidth = Math.min(420, window.innerWidth - 32);
      const panelHeightEstimate = 260;
      const below = rect.bottom + 16 + panelHeightEstimate < window.innerHeight;
      const left = Math.min(
        Math.max(16, rect.left + rect.width / 2 - panelWidth / 2),
        window.innerWidth - panelWidth - 16,
      );

      setHighlight({
        top: Math.max(padding, rect.top - padding),
        left: Math.max(padding, rect.left - padding),
        width: Math.min(rect.width + padding * 2, window.innerWidth - padding * 2),
        height: rect.height + padding * 2,
      });
      setPanelStyle({
        width: panelWidth,
        left,
        top: below
          ? rect.bottom + 16
          : Math.max(16, rect.top - panelHeightEstimate - 16),
      });
    }

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [activeStep, open]);

  function finishTutorial() {
    try {
      window.localStorage.setItem(storageKey, 'complete');
    } catch {
      // No se persiste la preferencia, pero el usuario puede continuar.
    }
    setOpen(false);
  }

  function openTutorial() {
    setStepIndex(0);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openTutorial}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1.5 text-[12px] font-bold text-dim transition-colors hover:border-primary/30 hover:text-primary"
      >
        <Icon name="book" className="size-3.5" />
        Ayuda
      </button>

      {open && (
        <div className="fixed inset-0 z-[80]">
          {highlight ? (
            <div
              aria-hidden
              className="pointer-events-none fixed rounded-[24px] border-2 border-primary bg-transparent shadow-[0_0_0_9999px_rgba(5,12,28,0.72),0_0_0_5px_rgba(143,141,255,0.22),0_18px_50px_rgba(0,0,0,0.28)] transition-all duration-300"
              style={highlight}
            />
          ) : (
            <div aria-hidden className="fixed inset-0 bg-[#050c1c]/75 backdrop-blur-[3px]" />
          )}

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-tutorial-title"
            aria-describedby="staff-tutorial-description"
            tabIndex={-1}
            style={highlight ? panelStyle : undefined}
            className={
              highlight
                ? 'fixed z-[90] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[24px] border border-white/10 bg-surface p-5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] outline-none'
                : 'fixed left-1/2 top-1/2 z-[90] w-[min(460px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/10 bg-surface p-6 shadow-[0_24px_80px_rgba(0,0,0,0.42)] outline-none sm:p-7'
            }
          >
            <div className="flex items-start gap-3.5">
              <IconTile name={activeStep.icon} color={activeStep.color} className="size-10 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary">
                  {activeStep.eyebrow}
                </p>
                <h2
                  id="staff-tutorial-title"
                  className="mt-1 text-[21px] font-extrabold leading-tight text-ink"
                >
                  {activeStep.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={finishTutorial}
                aria-label="Cerrar tutorial"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mist text-dim hover:text-ink"
              >
                <Icon name="exit" className="size-4" />
              </button>
            </div>

            <p
              id="staff-tutorial-description"
              className="mt-4 text-[14px] leading-relaxed text-dim"
            >
              {activeStep.description}
            </p>

            <div className="mt-5 flex items-center gap-1.5" aria-label="Progreso del tutorial">
              {steps.map((step, index) => (
                <span
                  key={step.title}
                  aria-hidden
                  className={`h-1.5 rounded-full transition-all ${
                    index === stepIndex ? 'w-7 bg-primary' : 'w-1.5 bg-fill'
                  }`}
                />
              ))}
              <span className="ml-2 text-[11px] font-semibold tabular-nums text-dim">
                {stepIndex + 1} de {steps.length}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={finishTutorial}
                className="px-1 py-2 text-[12px] font-semibold text-dim hover:text-ink"
              >
                Omitir tutorial
              </button>
              <div className="flex gap-2">
                {stepIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                    className="rounded-xl border border-line px-3.5 py-2.5 text-[13px] font-bold text-ink hover:bg-mist"
                  >
                    Atrás
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    isLastStep
                      ? finishTutorial()
                      : setStepIndex((current) => Math.min(steps.length - 1, current + 1))
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-white shadow-[0_8px_24px_rgba(94,92,230,0.3)] hover:brightness-105"
                >
                  {isLastStep ? 'Entendido' : 'Siguiente'}
                  <Icon name={isLastStep ? 'check' : 'arrow'} className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
