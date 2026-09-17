import Link from 'next/link';
import { PageHead } from './PageHead';
import styles from './CartView.module.css';
import viewStyles from './Views.module.css';
import { setQuantityAction } from '@/server/actions';
import { readCart } from '@/server/cart';
import { getFlags, orderingPossible } from '@/server/settings';
import { PRICE_NOTE } from '@/lib/price-note';
import { formatMoney } from '@/lib/money';
import { fill, type Dictionary } from '@/lib/dictionary';
import { hrefFor, type Locale } from '@/lib/i18n';
import { RESTAURANT } from '@/lib/restaurant';

/**
 * The basket.
 *
 * Plain forms posting to a server action, so quantities can be changed with
 * JavaScript switched off. Totals are read from the live menu on every render;
 * nothing here trusts a number that came from the browser.
 */
export async function CartView({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [cart, flags] = await Promise.all([readCart(locale), getFlags()]);
  const canOrder = orderingPossible(flags);

  if (!cart.lines.length) {
    return (
      <>
        <PageHead label={dict.nav.cart} title={dict.cart.title} />
        <div className={`section ${viewStyles.plain}`}>
          <div className="shell">
            <div className={styles.emptyBox}>
              <p>{dict.cart.empty}</p>
              <Link href={hrefFor(locale, 'menu')} className="btn btn--gold">
                {dict.cart.emptyCta}
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const changed = cart.problems.some((problem) => problem.kind === 'price_changed');
  const blocked = cart.problems.some((problem) => problem.kind !== 'price_changed');

  return (
    <>
      <PageHead label={dict.nav.cart} title={dict.cart.title} text={fill(dict.cart.items, { n: cart.itemCount })} />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <div className={viewStyles.grid2}>
            {/* ------------------------------------------------- lines -- */}
            <ul className={styles.lines}>
              {cart.lines.map((line) => (
                <li key={line.id} className={styles.line}>
                  <span className={styles.thumb}>
                    {line.photoId ? (
                      <img
                        src={`/img/dish/${line.photoId}-480.webp`}
                        alt=""
                        width={76}
                        height={76}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </span>

                  <div className={styles.lineBody}>
                    <Link href={hrefFor(locale, 'dish', { slug: line.slug })} className={styles.lineName}>
                      {line.name}
                    </Link>
                    <p className={styles.lineMeta}>{line.variantLabel}</p>
                    {line.note ? <p className={styles.lineNote}>„{line.note}“</p> : null}

                    {line.soldOut ? (
                      <p className={styles.lineWarn}>{fill(dict.cart.soldOut, { name: line.name })}</p>
                    ) : !line.orderable ? (
                      <p className={styles.lineWarn}>{dict.menu.dineInOnly}</p>
                    ) : null}
                    {line.priceChanged ? <p className={styles.lineWarn}>{dict.cart.priceChanged}</p> : null}
                  </div>

                  <div className={styles.lineActions}>
                    <p className={styles.linePrice}>{formatMoney(line.totalCents, locale)}</p>

                    <div className={styles.stepper}>
                      <form action={setQuantityAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="lineId" value={line.id} />
                        <input type="hidden" name="quantity" value={line.quantity - 1} />
                        <button type="submit" aria-label={dict.dish.less}>
                          −
                        </button>
                      </form>

                      <span className={styles.count}>{line.quantity}</span>

                      <form action={setQuantityAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="lineId" value={line.id} />
                        <input type="hidden" name="quantity" value={line.quantity + 1} />
                        <button type="submit" aria-label={dict.dish.more}>
                          +
                        </button>
                      </form>
                    </div>

                    <form action={setQuantityAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="lineId" value={line.id} />
                      <input type="hidden" name="quantity" value={0} />
                      <button type="submit" className={styles.remove}>
                        {dict.cart.remove}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>

            {/* ------------------------------------------------ summary -- */}
            <aside className={`${viewStyles.panel} ${styles.summary}`}>
              <h2 className={viewStyles.h3}>{dict.cart.subtotal}</h2>

              <dl className={styles.totals}>
                <div>
                  <dt>{dict.cart.subtotal}</dt>
                  <dd className={viewStyles.money}>{formatMoney(cart.subtotalCents, locale)}</dd>
                </div>
                <div className={styles.totalsMuted}>
                  <dt>{fill(dict.cart.tax, { rate: RESTAURANT.taxRateBasisPoints / 100 })}</dt>
                  <dd className={viewStyles.money}>{formatMoney(cart.taxCents, locale)}</dd>
                </div>
                <div className={styles.grand}>
                  <dt>{dict.cart.total}</dt>
                  <dd className={viewStyles.money}>{formatMoney(cart.subtotalCents, locale)}</dd>
                </div>
              </dl>

              {changed ? <p className={styles.notice}>{dict.cart.priceChanged}</p> : null}

              {canOrder ? (
                <Link
                  href={hrefFor(locale, 'checkout')}
                  className="btn btn--gold btn--block"
                  aria-disabled={blocked || undefined}
                  tabIndex={blocked ? -1 : undefined}
                >
                  {dict.cart.checkout}
                </Link>
              ) : (
                <p className={styles.notice}>{dict.order.closed}</p>
              )}

              <Link href={hrefFor(locale, 'menu')} className="linkArrow">
                {dict.cart.keepShopping}
              </Link>

              <p className={styles.fine}>{PRICE_NOTE[locale]}</p>
              {flags.demoMode ? <p className={styles.fine}>{dict.footer.demo}</p> : null}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
