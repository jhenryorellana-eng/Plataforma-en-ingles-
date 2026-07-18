import type { ReactNode } from 'react';
import { Icon, StarMark, type IconName } from './ui';

const HIGHLIGHTS: Array<{ icon: IconName; text: string }> = [
  { icon: 'route', text: 'StarMap mide tu nivel real y traza tu ruta hasta B2' },
  { icon: 'mic', text: 'Mentor por voz con límites claros y protección juvenil' },
  { icon: 'shield', text: 'Decisiones clave siempre con revisión humana' },
];

/**
 * Marco de páginas públicas: en escritorio, panel de marca a la izquierda
 * y contenido centrado a la derecha; en móvil, solo el contenido.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="grad-brand relative hidden overflow-hidden px-14 py-12 text-white lg:flex lg:flex-col">
        <StarMark
          className="star-float pointer-events-none absolute -right-24 top-1/3 size-96 text-white/10"
          aria-hidden
        />
        <StarMark className="pointer-events-none absolute bottom-24 left-16 size-8 text-white/20" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <StarMark className="size-4.5 text-white" />
          </span>
          <span className="text-[18px] font-bold tracking-tight">StarbizAcademy</span>
        </div>
        <div className="relative my-auto max-w-md py-16">
          <h1 className="text-[40px] font-extrabold leading-[1.1] tracking-tight">
            Tu ruta medible desde tu nivel real hasta tu meta en inglés.
          </h1>
          <ul className="mt-10 flex flex-col gap-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-center gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                  <Icon name={item.icon} className="size-4.5 text-white" />
                </span>
                <span className="text-[15px] font-medium leading-snug text-white/90">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[13px] leading-relaxed text-white/60">
          Metodología STAR · StarbizAcademy — inglés con evidencia, no con promesas.
        </p>
      </aside>
      <div className="flex min-h-dvh flex-col justify-center">{children}</div>
    </div>
  );
}
