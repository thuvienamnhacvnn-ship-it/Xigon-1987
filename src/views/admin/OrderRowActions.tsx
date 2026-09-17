'use client';

import styles from './Admin.module.css';
import { setOrderStatusAction } from '@/server/admin-actions';
import type { OrderStatus } from '@/db/schema';
import type { Locale } from '@/lib/i18n';

/**
 * What the counter can do to one order.
 *
 * The steps offered are the ones that can follow from where the order actually
 * is — an order nobody has accepted cannot be ready for collection — so the row
 * cannot be walked backwards by a mis-click. Everything is a plain form post:
 * these screens are used on a tablet by the door, on whatever connection the
 * restaurant has, and a button that needs JavaScript to work is a button that
 * sometimes does not.
 */
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string; strong?: boolean }[]>> = {
  awaiting_payment: [
    { status: 'placed', label: 'Als eingegangen führen' },
    { status: 'cancelled', label: 'Stornieren' },
  ],
  placed: [
    { status: 'accepted', label: 'Annehmen', strong: true },
    { status: 'rejected', label: 'Ablehnen' },
  ],
  accepted: [
    { status: 'preparing', label: 'In der Küche', strong: true },
    { status: 'cancelled', label: 'Stornieren' },
  ],
  preparing: [{ status: 'ready_for_pickup', label: 'Fertig zur Abholung', strong: true }],
  ready_for_pickup: [{ status: 'completed', label: 'Abgeholt', strong: true }],
  out_for_delivery: [{ status: 'completed', label: 'Zugestellt', strong: true }],
};

const LABEL: Record<OrderStatus, string> = {
  awaiting_payment: 'Warten auf Zahlung',
  placed: 'Eingegangen',
  accepted: 'Angenommen',
  preparing: 'In der Küche',
  ready_for_pickup: 'Fertig',
  out_for_delivery: 'Unterwegs',
  completed: 'Abgeschlossen',
  rejected: 'Abgelehnt',
  cancelled: 'Storniert',
};

export function OrderRowActions({
  id,
  status,
  date,
  locale,
}: {
  id: number;
  status: OrderStatus;
  date: string;
  locale: Locale;
}) {
  const steps = NEXT[status] ?? [];

  return (
    <div className={styles.rowActions}>
      <span className={styles.state}>{LABEL[status]}</span>

      {steps.map((step) => (
        <form key={step.status} action={setOrderStatusAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={step.status} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className={step.strong ? styles.actionStrong : styles.action}>
            {step.label}
          </button>
        </form>
      ))}
    </div>
  );
}
