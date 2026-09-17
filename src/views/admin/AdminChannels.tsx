import styles from './Admin.module.css';
import { channelStatuses } from '@/server/channels';
import { recentEvents } from '@/server/admin';

/**
 * The state of the booking platforms, said plainly.
 *
 * This screen exists because an integration that quietly stopped working looks
 * exactly like a quiet evening. It shows what is configured, what is missing,
 * and what each platform last actually sent — including deliveries that failed
 * their signature check, which is how you find out someone changed a secret.
 */
export async function AdminChannels() {
  const [channels, events] = await Promise.all([channelStatuses(), recentEvents(20)]);

  return (
    <div className={styles.page}>
      <section className={styles.panel}>
        <h2 className={styles.h2}>Anbindung</h2>
        <p className={styles.prose}>
          Quandoo und TheFork geben ihre Schnittstellen nur mit Partnervertrag heraus. Bis die Zugangsdaten
          vorliegen, läuft die Anbindung über einen Bridge-Dienst (Zapier, Make, n8n), der die Buchung im
          unten gezeigten Format an den jeweiligen Endpunkt schickt. Die Verarbeitung dahinter — Signatur,
          Dublettenschutz, Tischvergabe, Konflikte — ist fertig und ändert sich dadurch nicht.
        </p>

        <ul className={styles.platforms}>
          {channels.map((channel) => (
            <li key={channel.id} className={styles.platform} data-on={channel.configured}>
              <div className={styles.platformHead}>
                <span className={styles.platformName}>{channel.label}</span>
                <span className={styles.platformState}>
                  {channel.configured ? 'verbunden' : 'nicht eingerichtet'}
                </span>
              </div>

              <p className={styles.platformNote}>{channel.docsNote}</p>

              <dl className={styles.platformFacts}>
                <div>
                  <dt>Endpunkt</dt>
                  <dd>
                    <code>POST {channel.webhookPath}</code>
                  </dd>
                </div>
                <div>
                  <dt>Signatur</dt>
                  <dd>
                    <code>X-Xigon-Signature: sha256=…</code>
                  </dd>
                </div>
                {channel.missing.length ? (
                  <div>
                    <dt>Fehlt</dt>
                    <dd>
                      {channel.missing.map((key) => (
                        <code key={key}>{key}</code>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h2}>Format</h2>
        <pre className={styles.code}>{`{
  "externalId": "Q-99123",
  "action":     "booked" | "updated" | "cancelled",
  "date":       "2026-09-20",
  "time":       "19:30",
  "partySize":  4,
  "name":       "Anna Muster",
  "email":      "anna@example.com",
  "phone":      "+49 30 1234567",
  "note":       "Fensterplatz",
  "eventId":    "evt_123"
}`}</pre>
        <p className={styles.prose}>
          <code>externalId</code> ist die Buchungsnummer der Plattform: dieselbe Nummer aktualisiert die
          Reservierung, statt eine zweite anzulegen. <code>eventId</code> ist optional und verhindert, dass
          eine wiederholte Zustellung doppelt verarbeitet wird.
        </p>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.h2}>Zuletzt empfangen</h2>
        {events.length === 0 ? (
          <p className={styles.empty}>Bisher hat keine Plattform etwas geschickt.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Kanal</th>
                <th>Art</th>
                <th>Signatur</th>
                <th>Ergebnis</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.receivedAt.toLocaleString('de-DE')}</td>
                  <td>{event.channel}</td>
                  <td>{event.kind}</td>
                  <td>{event.signatureOk ? 'ok' : <span className={styles.danger}>ungültig</span>}</td>
                  <td>{event.result ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
