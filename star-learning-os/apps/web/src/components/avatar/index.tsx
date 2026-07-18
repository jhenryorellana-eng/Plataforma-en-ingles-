import type { AvatarConfig } from '@star/contracts';
import { Body } from './parts-body';
import { Features, Head } from './parts-face';
import { Hair } from './parts-hair';
import { Accessory, partitionAccessories } from './parts-accessories';

export { ALIEN_EXAMPLE, AVATAR_OPTIONS, DEFAULT_AVATAR } from './options';

/**
 * Avatar por capas SVG (viewBox 0 0 120 120, cara centrada en ~(60,58)):
 * accesorios back → cuerpo/outfit → cabeza+orejas → pelo → rasgos →
 * accesorios front (glasses/head/ears) → aura. Relleno plano + sombra suave.
 */
export function Avatar({
  config,
  size = 120,
  className = '',
  label,
}: {
  config: AvatarConfig;
  size?: number;
  className?: string;
  label?: string;
}) {
  const layers = partitionAccessories(config.accessories);
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ filter: 'drop-shadow(0 3px 8px rgba(21, 21, 42, 0.18))' }}
    >
      {layers.back.map((id) => (
        <Accessory key={id} id={id} />
      ))}
      <Body config={config} />
      <Head config={config} />
      <Hair style={config.hairStyle} color={config.hairColor} />
      <Features config={config} />
      {layers.front.map((id) => (
        <Accessory key={id} id={id} />
      ))}
      {layers.aura.map((id) => (
        <Accessory key={id} id={id} />
      ))}
    </svg>
  );
}
