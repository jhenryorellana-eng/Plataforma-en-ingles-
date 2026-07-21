import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { StarMark } from '@/components/ui';
import styles from './mission-shell.module.css';

type MissionStep = 1 | 2 | 3;

const STEPS = ['Elige tu rol', 'Crea tu cuenta', 'Traza tu ruta'];

export function MissionShell({
  children,
  locale,
  step,
}: {
  children: ReactNode;
  locale: string;
  step: MissionStep;
}) {
  return (
    <div className={styles.shell}>
      <aside className={styles.story} aria-label="Expedición Aurora">
        <Image
          src="/brand/registration/star-journey-hero.webp"
          alt="Dos estudiantes exploran una ruta de aprendizaje guiados por Nova"
          fill
          priority
          sizes="(min-width: 901px) 46vw, 100vw"
          className={styles.storyImage}
        />
        <div className={styles.storyTint} aria-hidden />
        <Link href={`/${locale}`} className={styles.brandLink} aria-label="Ir al inicio de StarbizAcademy">
          <span className={styles.brandMark}>
            <StarMark className="size-4.5 text-white" />
          </span>
          <span>StarbizAcademy</span>
        </Link>

        <div className={styles.storyCopy}>
          <span className={styles.kicker}>
            <span className={styles.kickerDot} aria-hidden />
            Expedición Aurora
          </span>
          <h2>Tu inglés puede sentirse como una aventura.</h2>
          <p>
            Nova convierte tu nivel real en una ruta de misiones, práctica y logros que sí puedes
            ver.
          </p>
        </div>

        <div className={styles.storyProof}>
          <span className={styles.proofStar} aria-hidden>
            <StarMark className="size-3.5 text-[#ffd35a]" />
          </span>
          <span>Tu nivel real</span>
          <span className={styles.proofLine} aria-hidden />
          <span>Tu propia ruta</span>
          <span className={styles.proofLine} aria-hidden />
          <span>Meta B2</span>
        </div>
      </aside>

      <section className={styles.content}>
        <div className={styles.ambientOrbA} aria-hidden />
        <div className={styles.ambientOrbB} aria-hidden />
        <div className={styles.mobileMissionTag} aria-hidden>
          <StarMark className="size-3.5 text-[#ffd35a]" />
          Expedición Aurora
        </div>
        <div className={styles.contentInner}>
          <MissionProgress current={step} />
          {children}
        </div>
      </section>
    </div>
  );
}

function MissionProgress({ current }: { current: MissionStep }) {
  return (
    <nav className={styles.progress} aria-label="Progreso del registro">
      <ol>
        {STEPS.map((label, index) => {
          const number = (index + 1) as MissionStep;
          const done = number < current;
          const active = number === current;
          return (
            <li
              key={label}
              className={active ? styles.progressActive : done ? styles.progressDone : undefined}
              aria-current={active ? 'step' : undefined}
            >
              <span className={styles.progressNode}>{done ? '✓' : number}</span>
              <span className={styles.progressLabel}>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function RoleChoiceCard({
  href,
  image,
  imageAlt,
  eyebrow,
  title,
  description,
  accent,
}: {
  href: string;
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: 'learner' | 'guardian';
}) {
  return (
    <Link href={href} className={`${styles.roleCard} ${styles[accent]}`}>
      <span className={styles.roleVisual}>
        <Image
          src={image}
          alt={imageAlt}
          fill
          sizes="(min-width: 1200px) 250px, (min-width: 641px) 40vw, 112px"
          className={styles.roleImage}
        />
        <span className={styles.roleVisualShade} aria-hidden />
        <span className={styles.roleEyebrow}>{eyebrow}</span>
      </span>
      <span className={styles.roleBody}>
        <span className={styles.roleTitle}>{title}</span>
        <span className={styles.roleDescription}>{description}</span>
        <span className={styles.roleCta}>
          Elegir esta ruta
          <span className={styles.roleArrow} aria-hidden>
            →
          </span>
        </span>
      </span>
    </Link>
  );
}

export function MissionIntro({
  image,
  imageAlt,
  eyebrow,
  title,
  description,
}: {
  image: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.intro}>
      <span className={styles.introVisual}>
        <Image src={image} alt={imageAlt} fill sizes="88px" className={styles.introImage} />
      </span>
      <span className={styles.introCopy}>
        <span className={styles.introEyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </span>
    </div>
  );
}

export { styles as missionStyles };
