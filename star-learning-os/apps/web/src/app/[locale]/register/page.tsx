import Link from 'next/link';
import { AppIcon, Group, Icon, IconTile } from '@/components/ui';

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-12">
      <div className="rise flex flex-col items-center text-center">
        <AppIcon className="size-16" />
        <h1 className="mt-5 text-[28px] font-extrabold leading-tight tracking-tight text-ink">
          Crear cuenta
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-dim">¿Quién eres?</p>
      </div>

      <Group className="rise rise-1 mt-8">
        <Link href={`/${locale}/register/learner`} className="flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-mist/60">
          <IconTile name="today" color="bg-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-ink">Soy estudiante</span>
            <span className="block text-[13px] text-dim">
              Desde los 12 años. Si eres menor, invitarás a tu apoderado.
            </span>
          </span>
          <Icon name="chevron" className="size-4 text-[#c7c7cc]" />
        </Link>
        <Link href={`/${locale}/register/guardian`} className="flex items-center gap-3.5 px-4 py-4 transition-colors hover:bg-mist/60">
          <IconTile name="shield" color="bg-teal" />
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold text-ink">Soy apoderado/a</span>
            <span className="block text-[13px] text-dim">
              Autorizas el servicio, gestionas permisos y ves el progreso.
            </span>
          </span>
          <Icon name="chevron" className="size-4 text-[#c7c7cc]" />
        </Link>
      </Group>

      <p className="mt-6 text-center">
        <Link href={`/${locale}/login`} className="text-[14px] font-medium text-primary">
          Ya tengo cuenta
        </Link>
      </p>
    </main>
  );
}
