'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { EconomyState } from '@star/contracts';
import { clientApi } from '@/lib/client-api';
import { Avatar } from '@/components/avatar';
import { Icon, StarMark } from '@/components/ui';

function MiniAvatar({ state, size }: { state: EconomyState; size: number }) {
  const inner = size - 2;
  if (!state.avatar) {
    return (
      <span
        className="grad-brand flex shrink-0 items-center justify-center rounded-full ring-1 ring-line"
        style={{ width: size, height: size }}
      >
        <StarMark className="size-1/2 text-white" />
      </span>
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-mist ring-1 ring-line"
      style={{ width: size, height: size }}
    >
      <Avatar config={state.avatar} size={inner} />
    </span>
  );
}

/**
 * Balance de Novas + racha + avatar en la navegación. Un solo fetch al
 * montar; si la API falla, se oculta sin romper la barra.
 */
export function EconomyBadge({
  locale,
  programCode,
  compact = false,
}: {
  locale: string;
  programCode: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<EconomyState | null>(null);

  useEffect(() => {
    let cancelled = false;
    clientApi<EconomyState>('/economy/state')
      .then((s) => {
        if (!cancelled) setState(s);
      })
      .catch(() => {
        // silencioso: la barra funciona igual sin economía
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;
  const href = `/${locale}/learn/${programCode}/avatar`;

  if (compact) {
    return (
      <Link
        href={href}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-mist"
        aria-label="Tu avatar y tus Novas"
      >
        <MiniAvatar state={state} size={28} />
        <span
          className="inline-flex items-center gap-1 text-[13px] font-bold text-gold-deep"
          aria-label={`${state.balance} Novas`}
        >
          <StarMark className="size-3 text-gold" />
          <span className="tabular-nums">{state.balance}</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-mist">
      <MiniAvatar state={state} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">Tu avatar</span>
        <span className="mt-0.5 flex items-center gap-2.5">
          <span
            className="inline-flex items-center gap-1 text-[12px] font-bold text-gold-deep"
            aria-label={`${state.balance} Novas`}
          >
            <StarMark className="size-3 text-gold" />
            <span className="tabular-nums">{state.balance}</span>
          </span>
          {state.streakDays > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-[12px] font-bold text-gold-deep"
              aria-label={`Racha de ${state.streakDays} días`}
            >
              <Icon name="flame" className="size-3.5 text-gold" />
              <span className="tabular-nums">{state.streakDays}</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}
