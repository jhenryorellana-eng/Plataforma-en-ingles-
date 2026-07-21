import type { ReactNode } from 'react';
import { NovaFace, type NovaState } from '@/components/nova';
import styles from './aurora.module.css';

export function NovaGuide({
  children,
  eyebrow = 'Nova · guía de misión',
  state = 'idle',
  className = '',
  compact = false,
}: {
  children: ReactNode;
  eyebrow?: string;
  state?: NovaState;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.novaGuide} ${compact ? styles.novaGuideCompact : ''} ${className}`}>
      <NovaFace state={state} className={compact ? 'size-12 shrink-0' : 'size-16 shrink-0'} />
      <div className={styles.novaBubble}>
        <p className={styles.novaEyebrow}>{eyebrow}</p>
        <div className={styles.novaMessage}>{children}</div>
      </div>
    </div>
  );
}
