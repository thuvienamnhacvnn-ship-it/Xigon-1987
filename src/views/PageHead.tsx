import Link from 'next/link';
import styles from './PageHead.module.css';
import { BotanicalBranch } from '@/components/Botanical';

/**
 * The band every inner page opens with.
 *
 * Kept flat and typographic rather than a second hero photograph: the banner on
 * the home page is the photograph, and repeating it on every page would make
 * none of them feel like an arrival.
 */
export function PageHead({
  label,
  title,
  text,
  back,
  children,
}: {
  label: string;
  title: string;
  text?: string | null;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.head}>
      <BotanicalBranch className={styles.leaf} />
      <div className="shell">
        {back ? (
          <Link href={back.href} className={styles.back}>
            <span aria-hidden="true">←</span> {back.label}
          </Link>
        ) : null}

        <p className="label">{label}</p>
        <h1 className={styles.title}>{title}</h1>
        <hr className={`rule ${styles.rule}`} />
        {text ? <p className={`lede ${styles.text}`}>{text}</p> : null}
        {children}
      </div>
    </header>
  );
}
