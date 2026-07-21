import Link from 'next/link';
import { NovaFace } from '@/components/nova';
import {
  MissionShell,
  RoleChoiceCard,
} from '@/components/registration/mission-shell';

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return (
    <MissionShell locale={locale} step={1}>
      <main>
        <div className="flex items-start gap-3.5">
          <NovaFace state="idle" className="mt-0.5 size-16 shrink-0 sm:size-[72px]" />
          <div className="relative min-w-0 rounded-[22px_22px_22px_7px] border border-white/10 bg-white/[0.055] px-4 py-3.5 shadow-[0_5px_0_#040d18] backdrop-blur-sm">
            <span className="absolute -left-1.5 top-5 size-3 rotate-45 border-b border-l border-white/10 bg-[#0e2137]" aria-hidden />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-cyan-300">
              Nova · guía de misión
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-200">
              Antes de despegar, dime cómo quieres entrar a esta aventura.
            </p>
          </div>
        </div>

        <div className="mt-7">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#ffd35a]">
            Elige tu punto de partida
          </p>
          <h1 className="mt-2 max-w-[15ch] text-[clamp(2rem,4.2vw,3.25rem)] font-extrabold leading-[0.98] tracking-[-0.055em] text-white text-balance">
            ¿Cómo empieza tu misión?
          </h1>
          <p className="mt-3 max-w-[54ch] text-[13.5px] leading-relaxed text-[#9eb1c7]">
            Cada ruta tiene herramientas distintas. Selecciona la que te representa para preparar
            una experiencia hecha para ti.
          </p>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <RoleChoiceCard
            href={`/${locale}/register/learner`}
            image="/brand/registration/role-learner.webp"
            imageAlt="Estudiante exploradora junto a Nova y una ruta de estrellas"
            eyebrow="Quiero aprender"
            title="Soy estudiante"
            description="Desde los 12 años: descubre tu nivel, crea tu avatar y avanza por misiones hechas para ti."
            accent="learner"
          />
          <RoleChoiceCard
            href={`/${locale}/register/guardian`}
            image="/brand/registration/role-guardian.webp"
            imageAlt="Apoderado acompañando una ruta de aprendizaje desde el control de misión"
            eyebrow="Quiero acompañar"
            title="Soy apoderado/a"
            description="Autoriza el servicio, gestiona permisos y sigue el progreso sin invadir su espacio."
            accent="guardian"
          />
        </div>

        <p className="mt-8 text-center text-[12.5px] text-[#8198b1]">
          ¿Ya tienes una cuenta?{' '}
          <Link
            href={`/${locale}/login`}
            className="rounded-md font-extrabold text-[#8fa5ff] underline-offset-4 hover:text-[#b7c2ff] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd35a]"
          >
            Inicia sesión
          </Link>
        </p>
      </main>
    </MissionShell>
  );
}
