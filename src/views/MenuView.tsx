import { PageHead } from './PageHead';
import styles from './Views.module.css';
import { MenuBrowser } from '@/components/MenuBrowser';
import { getMenu } from '@/server/menu';
import { PRICE_NOTE } from '@/lib/price-note';
import type { Dictionary } from '@/lib/dictionary';
import type { Locale } from '@/lib/i18n';

export async function MenuView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const menu = await getMenu(locale);

  return (
    <>
      <PageHead label={dict.menu.label} title={dict.menu.title} text={dict.menu.intro} />

      <div className={`section ${styles.plain}`}>
        <div className="shell">
          {/* Two standing caveats, once at the top rather than on every row. */}
          <div className={styles.notice}>
            <p>{PRICE_NOTE[locale]}</p>
            <p>{dict.menu.crossContact}</p>
          </div>

          {menu.length ? (
            <MenuBrowser categories={menu} locale={locale} dict={dict} />
          ) : (
            <p className={styles.empty}>{dict.menu.unpublished}</p>
          )}
        </div>
      </div>
    </>
  );
}
