import { getImageProps } from 'next/image';
import type { CSSProperties } from 'react';
import { AURORA_ASSETS, type AuroraAssetName } from './aurora-assets';
import styles from './aurora.module.css';

export function AuroraArt({
  asset,
  alt = '',
  className = '',
  priority = false,
  sizes = '(max-width: 767px) 100vw, 70vw',
  position = 'center',
  mobilePosition = 'center',
}: {
  asset: AuroraAssetName;
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  position?: string;
  mobilePosition?: string;
}) {
  const source = AURORA_ASSETS[asset];
  const common = {
    alt,
    sizes,
    quality: 84,
  };
  const {
    props: { srcSet: desktopSrcSet, ...desktopProps },
  } = getImageProps({
    ...common,
    src: source.desktop,
    width: source.desktopSize.width,
    height: source.desktopSize.height,
  });
  const {
    props: { srcSet: mobileSrcSet },
  } = getImageProps({
    ...common,
    src: source.mobile,
    width: source.mobileSize.width,
    height: source.mobileSize.height,
  });

  return (
    <picture
      className={`${styles.art} ${className}`}
      style={
        {
          '--aurora-position': position,
          '--aurora-mobile-position': mobilePosition,
        } as CSSProperties
      }
    >
      <source media="(max-width: 767px)" srcSet={mobileSrcSet} />
      <img
        {...desktopProps}
        srcSet={desktopSrcSet}
        className={styles.artImage}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
      />
    </picture>
  );
}
