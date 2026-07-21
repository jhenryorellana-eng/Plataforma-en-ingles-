'use client';

import { useEffect, useState } from 'react';
import type { AvatarConfig, EconomyState } from '@star/contracts';
import { clientApi, ClientApiError } from '@/lib/client-api';
import { ALIEN_EXAMPLE, Avatar, AVATAR_OPTIONS, DEFAULT_AVATAR } from '@/components/avatar';
import { Chip, Icon, Skeleton, StarMark } from '@/components/ui';
import { AuroraSurface } from '@/components/aurora/aurora-hero';
import { NovaGuide } from '@/components/aurora/nova-guide';
import { PickerSection, SpeciesSelector, SwatchRow, TraitRow } from './trait-pickers';
import { ShopSection } from './shop-section';

const PURCHASE_ERRORS: Record<string, string> = {
  ITEM_NOT_FOUND: 'Este artículo ya no está disponible.',
  ALREADY_OWNED: 'Ya tienes este artículo en tu inventario.',
  INSUFFICIENT_NOVAS: 'Todavía no te alcanzan las Novas para este artículo.',
};

function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ClientApiError && PURCHASE_ERRORS[err.code]) return PURCHASE_ERRORS[err.code];
  return err instanceof Error ? err.message : fallback;
}

function AvatarSkeleton() {
  return (
    <div className="flex flex-col gap-7" role="status" aria-label="Cargando tu avatar">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="mx-auto size-52 rounded-full" />
      <Skeleton className="h-24 w-full rounded-3xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <span className="sr-only">Cargando tu avatar</span>
    </div>
  );
}

export function AvatarCreator() {
  const [economy, setEconomy] = useState<EconomyState | null>(null);
  const [draft, setDraft] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    clientApi<EconomyState>('/economy/state')
      .then((state) => {
        if (cancelled) return;
        setEconomy(state);
        setDraft({ ...(state.avatar ?? DEFAULT_AVATAR), accessories: state.equipped });
        setDirty(false);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(friendlyError(err, 'No pudimos cargar tu avatar.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);

  function update(patch: Partial<AvatarConfig>) {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (patch.species) {
        const palette = AVATAR_OPTIONS.skins[patch.species];
        if (!palette.includes(next.skin)) next.skin = palette[0];
      }
      return next;
    });
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setActionError(null);
    try {
      await clientApi<{ ok: true }>('/economy/avatar', { method: 'PUT', body: JSON.stringify({ config: draft }) });
      setEconomy((prev) => (prev ? { ...prev, avatar: draft } : prev));
      setDirty(false);
      setSaved(true);
    } catch (err) {
      setActionError(friendlyError(err, 'No se pudo guardar tu avatar.'));
    } finally {
      setSaving(false);
    }
  }

  async function purchase(itemId: string) {
    setBusyItem(itemId);
    setActionError(null);
    try {
      const { balance } = await clientApi<{ balance: number }>('/economy/purchase', {
        method: 'POST',
        body: JSON.stringify({ itemId }),
      });
      setEconomy((prev) => (prev ? { ...prev, balance, inventory: [...prev.inventory, itemId] } : prev));
    } catch (err) {
      setActionError(friendlyError(err, 'No se pudo completar la compra.'));
    } finally {
      setBusyItem(null);
    }
  }

  async function toggleEquip(itemId: string, equip: boolean) {
    setBusyItem(itemId);
    setActionError(null);
    try {
      const { equipped } = await clientApi<{ equipped: string[] }>('/economy/equip', {
        method: 'POST',
        body: JSON.stringify({ itemId, equipped: equip }),
      });
      setEconomy((prev) => (prev ? { ...prev, equipped } : prev));
      setDraft((prev) => ({ ...prev, accessories: equipped }));
    } catch (err) {
      setActionError(friendlyError(err, 'No se pudo cambiar el accesorio.'));
    } finally {
      setBusyItem(null);
    }
  }

  if (loading) return <AvatarSkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <header className="rise flex items-start justify-between gap-3">
        <div>
          <p className="mission-kicker text-[9px] text-teal">Identidad de explorador</p>
          <h1 className="mt-1 text-[32px] font-extrabold tracking-[-0.045em] text-ink sm:text-[38px]">
            Tu avatar de misión
          </h1>
          <p className="mt-1 text-[14px] text-dim">Hazlo tuyo: será quien avance por tu StarMap.</p>
        </div>
        {economy && (
          <div className="flex flex-col items-end gap-1.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1.5 text-[14px] font-bold text-gold-deep"
              aria-label={`${economy.balance} Novas`}
            >
              <StarMark className="size-3.5 text-gold" />
              <span className="tabular-nums">{economy.balance}</span>
              Novas
            </span>
            {economy.streakDays > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-[12px] font-bold text-gold-deep">
                <Icon name="flame" className="size-3.5" />
                {economy.streakDays} {economy.streakDays === 1 ? 'día' : 'días'}
              </span>
            )}
          </div>
        )}
      </header>

      <NovaGuide compact state="idle">
        Tu avatar es parte de la experiencia. Puedes cambiarlo cuando quieras sin perder progreso.
      </NovaGuide>

      {loadError && (
        <div className="rise flex items-center gap-2.5 rounded-2xl bg-risk-soft px-4 py-3 text-[14px] font-medium text-risk" role="alert">
          <Icon name="flag" className="size-4 shrink-0" />
          <span className="flex-1">{loadError} Seguimos con los valores por defecto.</span>
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="shrink-0 font-bold underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      )}

      <AuroraSurface
        tone="cyan"
        className="rise rise-1 relative mx-auto flex h-72 w-full max-w-md items-center justify-center overflow-hidden"
      >
        <div
          className="pointer-events-none absolute inset-x-10 bottom-5 h-12 rounded-[50%] border border-teal/20 bg-primary/10 blur-sm"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full border border-primary/20 shadow-[inset_0_0_55px_rgba(89,108,255,.1)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full border border-teal/15"
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(124,122,255,0.34), rgba(23,184,205,0.13) 42%, transparent 68%)',
          }}
          aria-hidden
        />
        <div className="halo-ring absolute inset-10 rounded-full" aria-hidden />
        <Avatar config={draft} size={208} label="Vista previa de tu avatar" />
        <div className="absolute bottom-5 h-3.5 w-44 rounded-[50%] bg-primary/20 blur-sm" aria-hidden />
        {dirty && (
          <span className="absolute -top-1 right-2">
            <Chip tone="warn">Sin guardar</Chip>
          </span>
        )}
      </AuroraSurface>

      <AuroraSurface className="rise rise-1 flex flex-col gap-6 p-5 sm:p-6" tone="blue">
        <PickerSection label="Especie">
          <SpeciesSelector
            selected={draft.species}
            onSelect={(species) => update({ species })}
            humanExample={DEFAULT_AVATAR}
            alienExample={ALIEN_EXAMPLE}
          />
        </PickerSection>
        <PickerSection label="Piel">
          <SwatchRow
            colors={AVATAR_OPTIONS.skins[draft.species]}
            selected={draft.skin}
            onSelect={(skin) => update({ skin })}
            ariaLabel="Color de piel"
          />
        </PickerSection>
        <PickerSection label="Rostro">
          <TraitRow
            options={AVATAR_OPTIONS.faceShapes}
            selected={draft.faceShape}
            onSelect={(faceShape) => update({ faceShape })}
            thumb={(faceShape) => ({ ...draft, faceShape, accessories: [] })}
            ariaLabel="Forma del rostro"
          />
        </PickerSection>
        <PickerSection label="Cabello">
          <TraitRow
            options={AVATAR_OPTIONS.hairStyles}
            selected={draft.hairStyle}
            onSelect={(hairStyle) => update({ hairStyle })}
            thumb={(hairStyle) => ({ ...draft, hairStyle, accessories: [] })}
            ariaLabel="Estilo de cabello"
          />
          <div className="mt-3">
            <SwatchRow
              colors={AVATAR_OPTIONS.hairColors}
              selected={draft.hairColor}
              onSelect={(hairColor) => update({ hairColor })}
              ariaLabel="Color de cabello"
            />
          </div>
        </PickerSection>
        <PickerSection label="Ojos">
          <TraitRow
            options={AVATAR_OPTIONS.eyes}
            selected={draft.eyes}
            onSelect={(eyes) => update({ eyes })}
            thumb={(eyes) => ({ ...draft, eyes, accessories: [] })}
            ariaLabel="Ojos"
          />
        </PickerSection>
        <PickerSection label="Boca">
          <TraitRow
            options={AVATAR_OPTIONS.mouths}
            selected={draft.mouth}
            onSelect={(mouth) => update({ mouth })}
            thumb={(mouth) => ({ ...draft, mouth, accessories: [] })}
            ariaLabel="Boca"
          />
        </PickerSection>
        <PickerSection label="Outfit">
          <TraitRow
            options={AVATAR_OPTIONS.outfits}
            selected={draft.outfit}
            onSelect={(outfit) => update({ outfit })}
            thumb={(outfit) => ({ ...draft, outfit, accessories: [] })}
            ariaLabel="Outfit"
          />
        </PickerSection>
      </AuroraSurface>

      <div className="rise rise-2 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving || (!dirty && saved)}
          className="tactile-button min-h-12 rounded-2xl px-8 text-[15px] font-extrabold text-white disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {saved && !dirty && (
          <p className="combo-pop inline-flex items-center gap-1.5 text-[13px] font-bold text-ok-deep">
            <Icon name="check" className="size-4" />
            Guardado
          </p>
        )}
        {actionError && (
          <p role="alert" className="text-[13px] font-medium text-risk">
            {actionError}
          </p>
        )}
      </div>

      <section className="rise rise-3 flex flex-col gap-3">
        <div>
          <p className="mission-kicker text-[9px] text-gold-deep">Inventario de expedición</p>
          <h2 className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">Tienda de estilo</h2>
          <p className="text-[13px] text-dim">Desbloquea piezas completando tus misiones diarias.</p>
        </div>
        {economy ? (
          <ShopSection
            shop={economy.shop}
            inventory={economy.inventory}
            equipped={economy.equipped}
            balance={economy.balance}
            busyItem={busyItem}
            onPurchase={purchase}
            onToggleEquip={toggleEquip}
          />
        ) : (
          <p className="rounded-2xl bg-mist px-4 py-6 text-center text-[14px] text-dim">
            La tienda se abrirá cuando podamos conectar con el servidor.
          </p>
        )}
      </section>
    </div>
  );
}
