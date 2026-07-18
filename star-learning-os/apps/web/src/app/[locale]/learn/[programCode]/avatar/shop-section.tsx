import type { ReactNode } from 'react';
import type { EconomyShopItem } from '@star/contracts';
import { Avatar, DEFAULT_AVATAR } from '@/components/avatar';
import { Icon, StarMark } from '@/components/ui';

/** Grid de la tienda de estilo: tarjetas con preview, precio y acción por estado. */
export function ShopSection({
  shop,
  inventory,
  equipped,
  balance,
  busyItem,
  onPurchase,
  onToggleEquip,
}: {
  shop: EconomyShopItem[];
  inventory: string[];
  equipped: string[];
  balance: number;
  busyItem: string | null;
  onPurchase: (itemId: string) => void;
  onToggleEquip: (itemId: string, equip: boolean) => void;
}) {
  if (shop.length === 0) {
    return (
      <p className="rounded-2xl bg-mist px-4 py-6 text-center text-[14px] text-dim">
        La tienda está en camino. Vuelve pronto para estrenar accesorios.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
      {shop.map((item) => (
        <ShopCard
          key={item.id}
          item={item}
          owned={inventory.includes(item.id)}
          isEquipped={equipped.includes(item.id)}
          affordable={balance >= item.price}
          busy={busyItem === item.id}
          onPurchase={onPurchase}
          onToggleEquip={onToggleEquip}
        />
      ))}
    </div>
  );
}

function ShopCard({
  item,
  owned,
  isEquipped,
  affordable,
  busy,
  onPurchase,
  onToggleEquip,
}: {
  item: EconomyShopItem;
  owned: boolean;
  isEquipped: boolean;
  affordable: boolean;
  busy: boolean;
  onPurchase: (itemId: string) => void;
  onToggleEquip: (itemId: string, equip: boolean) => void;
}) {
  const preview = { ...DEFAULT_AVATAR, accessories: [item.id] };
  const base =
    'flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-[13px] font-bold transition-all disabled:opacity-70';

  let action: ReactNode;
  if (busy) {
    action = (
      <span className={`${base} bg-fill text-dim`} aria-busy>
        …
      </span>
    );
  } else if (isEquipped) {
    action = (
      <button type="button" onClick={() => onToggleEquip(item.id, false)} className={`${base} bg-ok-soft text-ok-deep`}>
        <Icon name="check" className="size-3.5" />
        Equipado
      </button>
    );
  } else if (owned) {
    action = (
      <button
        type="button"
        onClick={() => onToggleEquip(item.id, true)}
        className={`${base} bg-primary-soft text-primary hover:opacity-80`}
      >
        Equipar
      </button>
    );
  } else if (affordable) {
    action = (
      <button type="button" onClick={() => onPurchase(item.id)} className={`${base} btn-gradient text-white`}>
        Comprar
      </button>
    );
  } else {
    action = (
      <span className={`${base} bg-fill text-dim`} title="Te faltan Novas">
        Novas insuficientes
      </span>
    );
  }

  return (
    <div className="card-shadow flex flex-col items-center rounded-2xl bg-surface p-3.5">
      <div className="flex size-[88px] items-center justify-center rounded-2xl bg-mist">
        <Avatar config={preview} size={76} />
      </div>
      <p className="mt-2.5 text-center text-[14px] font-bold leading-tight text-ink">{item.name}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-gold-deep">
        <StarMark className="size-3 text-gold" />
        <span className="tabular-nums">{item.price}</span>
      </p>
      <div className="mt-2.5 w-full">{action}</div>
    </div>
  );
}
