import type { ReactNode } from 'react';
import type { AvatarConfig } from '@star/contracts';
import { Avatar } from '@/components/avatar';
import { Icon } from '@/components/ui';

/** Sección del creador: etiqueta uppercase estilo iOS + contenido. */
export function PickerSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="px-1 pb-2 text-[13px] font-medium uppercase tracking-wide text-dim">{label}</h3>
      {children}
    </section>
  );
}

/** Fila de muestras de color con anillo de selección. */
export function SwatchRow({
  colors,
  selected,
  onSelect,
  ariaLabel,
}: {
  colors: string[];
  selected: string;
  onSelect: (color: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={ariaLabel}>
      {colors.map((color) => {
        const active = color === selected;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={color}
            onClick={() => onSelect(color)}
            className={`size-9 rounded-full transition-transform hover:scale-110 ${
              active ? 'ring-2 ring-primary ring-offset-2 ring-offset-paper' : 'ring-1 ring-line'
            }`}
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}

/** Fila de miniaturas vivas: cada opción se renderiza sobre un mini avatar. */
export function TraitRow<T extends string>({
  options,
  selected,
  onSelect,
  thumb,
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  selected: T;
  onSelect: (id: T) => void;
  thumb: (id: T) => AvatarConfig;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.id === selected;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(option.id)}
            className={`card-shadow relative flex w-[70px] flex-col items-center gap-0.5 rounded-2xl bg-surface px-1.5 pb-2 pt-1.5 transition-all ${
              active ? 'ring-2 ring-primary' : 'ring-1 ring-line hover:ring-primary/40'
            }`}
          >
            <Avatar config={thumb(option.id)} size={48} />
            <span className={`text-[11px] font-semibold ${active ? 'text-primary' : 'text-dim'}`}>
              {option.label}
            </span>
            {active && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white shadow">
                <Icon name="check" className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Selector de especie: dos tarjetas grandes con avatar de ejemplo. */
export function SpeciesSelector({
  selected,
  onSelect,
  humanExample,
  alienExample,
}: {
  selected: AvatarConfig['species'];
  onSelect: (species: AvatarConfig['species']) => void;
  humanExample: AvatarConfig;
  alienExample: AvatarConfig;
}) {
  const cards = [
    { id: 'human' as const, label: 'Humano', config: humanExample },
    { id: 'alien' as const, label: 'Alien', config: alienExample },
  ];
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Especie">
      {cards.map((card) => {
        const active = card.id === selected;
        return (
          <button
            key={card.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(card.id)}
            className={`card-shadow relative flex flex-col items-center gap-2 rounded-3xl bg-surface p-4 transition-all ${
              active ? 'ring-2 ring-primary' : 'ring-1 ring-line hover:ring-primary/40'
            }`}
          >
            <Avatar config={card.config} size={76} />
            <span className={`text-[15px] font-bold ${active ? 'text-primary' : 'text-ink'}`}>
              {card.label}
            </span>
            {active && (
              <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-white shadow">
                <Icon name="check" className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
