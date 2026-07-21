import type { ReactNode } from 'react';
import { AuroraArt } from './aurora-art';
import type { AuroraAssetName } from './aurora-assets';
import styles from './aurora.module.css';

export function AuroraHero({
  asset,
  eyebrow,
  title,
  body,
  children,
  badge,
  className = '',
  tone = 'blue',
  priority = false,
  imageAlt = '',
  compact = false,
}: {
  asset: AuroraAssetName;
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
  badge?: ReactNode;
  className?: string;
  tone?: 'blue' | 'cyan' | 'gold' | 'coral';
  priority?: boolean;
  imageAlt?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`${styles.hero} ${compact ? styles.heroCompact : ''} ${className}`}
      data-tone={tone}
    >
      <AuroraArt asset={asset} alt={imageAlt} priority={priority} />
      <span className={styles.heroTint} aria-hidden />
      <span className={styles.heroOrbit} aria-hidden />
      <div className={styles.heroContent}>
        {eyebrow && <p className={styles.heroEyebrow}>{eyebrow}</p>}
        <h1 className={styles.heroTitle}>{title}</h1>
        {body && <div className={styles.heroBody}>{body}</div>}
        {children && <div className={styles.heroActions}>{children}</div>}
      </div>
      {badge && <div className={styles.heroBadge}>{badge}</div>}
    </section>
  );
}

export function AuroraSurface({
  children,
  className = '',
  tone = 'blue',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: 'blue' | 'cyan' | 'gold' | 'coral' | 'neutral';
  interactive?: boolean;
}) {
  return (
    <div
      className={`${styles.surface} ${interactive ? styles.surfaceInteractive : ''} ${className}`}
      data-tone={tone}
    >
      {children}
    </div>
  );
}
