import styles from './SectionHead.module.css';

/**
 * The heading block every section on the page shares: a letterspaced label, a
 * display title, a gold rule, and optionally a line of prose and a link on the
 * right. Repeating it as a component is what keeps the rhythm even.
 */
export function SectionHead({
  label,
  title,
  text,
  aside,
  align = 'left',
}: {
  label: string;
  title: string;
  text?: string | null;
  aside?: React.ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <header className={`${styles.head} ${align === 'center' ? styles.center : ''}`} data-reveal>
      <div className={styles.main}>
        <p className="label">{label}</p>
        <h2 className={styles.title}>{title}</h2>
        <hr className={`rule ${styles.rule}`} />
        {text ? <p className={styles.text}>{text}</p> : null}
      </div>
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </header>
  );
}
