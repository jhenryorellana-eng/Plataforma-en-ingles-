'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clientApi } from '@/lib/client-api';
import { Icon } from '@/components/ui';

/** Cierre de sesión para vistas sin dock del alumno (portal familiar, staff). */
export function LogoutButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          // Salir SIEMPRE navega: si la API es inalcanzable, la cookie local expira igual.
          await clientApi('/auth/logout', { method: 'POST' });
        } catch {
          // La sesión del servidor se revoca en el próximo request autenticado.
        } finally {
          router.push(`/${locale}/login`);
        }
      }}
      className="flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-[12px] font-bold text-dim transition hover:text-ink disabled:opacity-60"
    >
      <Icon name="logout" className="size-4" />
      {busy ? 'Saliendo…' : 'Salir'}
    </button>
  );
}
