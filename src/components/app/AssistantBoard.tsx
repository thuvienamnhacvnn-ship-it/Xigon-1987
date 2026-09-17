'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AssistantBoard.module.css';
import { EdgeLight } from './EdgeLight';
import type { Suggestion } from '@/lib/suggestion';
import { formatMoney } from '@/lib/money';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';
import { addToCartAction } from '@/server/actions';

type Message = {
  role: 'user' | 'assistant';
  text: string;
  /* Stamped when the message is made, never during render: the guest's clock is
     the only one on this screen and the server has no business guessing it. */
  at: Date;
  suggestions?: Suggestion[];
};

/**
 * KI-Berater.
 *
 * Two cards rather than one panel: the talking on the left, the one plate it
 * last named on the right. Splitting them is the point — in a single column a
 * suggestion scrolls out of sight the moment the next question is asked, and a
 * guest who wanted the price had to scroll back for it.
 *
 * Every card here was resolved by the server against the published catalogue,
 * so the name, the variant and the price are the card's own. Nothing reaches a
 * basket unless the guest presses the button.
 */
export function AssistantBoard({
  locale,
  dict,
  sample,
}: {
  locale: Locale;
  dict: Dictionary;
  /*
   * A real dish from the card, shown before the guide has said anything.
   *
   * The column used to hold a dashed outline and a sentence, which is a polite
   * way of showing nothing at all — half the screen empty while the guest is
   * still deciding whether to type. A plate from the published card fills it
   * with the thing the screen is about, and the chip on the photograph says it
   * is an example rather than an answer.
   */
  sample: Suggestion | null;
}) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  // A plain boolean, not a transition: awaiting a request inside startTransition
  // leaves this screen pending forever, which this project has already paid for.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);

  const clock = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    [locale],
  );

  // The right card follows the latest proposal; an older one still readable in
  // the log would be answering a question the guest has moved on from.
  const plate = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role === 'assistant' && message.suggestions?.length) return message.suggestions[0];
    }
    return null;
  }, [messages]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    setMessages((prev) => [...prev, { role: 'user', text: question, at: new Date() }]);
    setInput('');
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, locale, threadId }),
      });

      if (response.status === 429) {
        setError(dict.assistant.limit);
        return;
      }
      if (!response.ok) throw new Error(String(response.status));

      const body = (await response.json()) as { answer: string; suggestions?: Suggestion[]; threadId?: string };
      if (body.threadId) setThreadId(body.threadId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: body.answer, suggestions: body.suggestions, at: new Date() },
      ]);
    } catch {
      // A provider outage must never take the menu with it.
      setError(dict.assistant.unavailable);
    } finally {
      setBusy(false);
    }
  }

  /*
   * There is no cart endpoint, and there should not be one.
   *
   * Everything that changes a basket goes through the server action the rest of
   * the site uses, so a price, an availability check and a sold-out flag are
   * decided in exactly one place. A second path through a REST route would be a
   * second set of rules to keep in step, and the first time they drifted a guest
   * would be charged yesterday's price.
   */
  async function add(suggestion: Suggestion) {
    const form = new FormData();
    form.set('locale', locale);
    form.set('dishId', suggestion.dishId);
    form.set('variantId', suggestion.variantId);
    form.set('quantity', '1');

    setBusy(true);
    const result = await addToCartAction({ status: 'idle' }, form);
    setBusy(false);

    if (result.status !== 'added') {
      setError(dict.dish.notOnline);
      return;
    }
    window.location.assign(hrefFor(locale, 'cart'));
  }

  return (
    <div className={styles.board}>
      {/* ---------- the conversation ---------- */}
      <section className={`glass ${styles.talk}`} aria-label={dict.assistant.role}>
        <EdgeLight />
        <header className={styles.head}>
          <span className={styles.headMark}>
            <BrainMark size={28} />
          </span>
          <span className={styles.headText}>
            <span className={styles.headName}>{dict.assistant.name}</span>
            <span className={styles.headRole}>
              {dict.assistant.role} · {dict.shell.demoBadge}
            </span>
          </span>
        </header>

        {/* The one box on this screen allowed to scroll. */}
        <div className={styles.log} ref={logRef} role="log" aria-live="polite">
          {messages.length === 0 ? <p className={styles.intro}>{dict.assistant.intro}</p> : null}

          {messages.map((message, index) => (
            <div key={index} className={message.role === 'user' ? styles.rowUser : styles.rowBot}>
              <span className={styles.rowMark}>
                {message.role === 'user' ? <GuestMark /> : <BrainMark size={19} />}
              </span>
              <div className={styles.rowBody}>
                <p className={message.role === 'user' ? styles.userMsg : styles.botMsg}>{message.text}</p>
                <time className={styles.stamp} dateTime={message.at.toISOString()}>
                  {clock.format(message.at)}
                </time>
              </div>
            </div>
          ))}

          {busy ? <p className={styles.intro}>{dict.assistant.thinking}</p> : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          {/* Three ways in, for a guest who does not know what to ask a menu. */}
          <div className={styles.prompts}>
            {dict.assistant.prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className={`ghost ${styles.prompt}`}
                disabled={busy}
                onClick={() => void send(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/*
           * The allergen caveat rides at the foot of the log rather than under
           * the field: the log is scrolled to its end after every answer, so
           * this is the line the guest is looking at when they read a dish.
           */}
          <p className={styles.caveat}>
            <span className={styles.infoMark} aria-hidden="true">
              i
            </span>
            {dict.assistant.disclaimer}
          </p>
        </div>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <label htmlFor="assistant-board-input" className="visually-hidden">
            {dict.assistant.placeholder}
          </label>
          <input
            id="assistant-board-input"
            className={styles.field}
            value={input}
            maxLength={400}
            autoComplete="off"
            placeholder={dict.assistant.placeholder}
            onChange={(event) => setInput(event.target.value)}
          />
          <button
            type="submit"
            className={styles.send}
            disabled={busy || !input.trim()}
            aria-label={dict.assistant.send}
            title={dict.assistant.send}
          >
            <SendMark />
          </button>
        </form>
      </section>

      {/* ---------- the plate it named ---------- */}
      <section className={`glass ${styles.plate}`} aria-label={dict.assistant.proposal}>
        <EdgeLight />
        {plate ? (
          <PlateCard locale={locale} dict={dict} suggestion={plate} onAdd={add} />
        ) : sample ? (
          <PlateCard locale={locale} dict={dict} suggestion={sample} onAdd={add} example />
        ) : (
          /* Only when the card itself is empty. */
          <div className={styles.waiting}>
            <BrainMark size={40} className={styles.waitingMark} />
            <p className={styles.waitingText}>{dict.assistant.teaser}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function PlateCard({
  locale,
  dict,
  suggestion,
  onAdd,
  example = false,
}: {
  locale: Locale;
  dict: Dictionary;
  suggestion: Suggestion;
  onAdd: (suggestion: Suggestion) => void;
  /** Shown before the guide has answered: a real dish, but nobody's answer. */
  example?: boolean;
}) {
  const href = hrefFor(locale, 'dish', { slug: suggestion.slug });

  return (
    <>
      <div className={styles.photoWrap} data-sold-out={suggestion.soldOut ? 'true' : undefined}>
        {suggestion.photoId ? (
          <img
            className={styles.photo}
            src={`/img/dish/${suggestion.photoId}-720.webp`}
            srcSet={`/img/dish/${suggestion.photoId}-480.webp 480w, /img/dish/${suggestion.photoId}-720.webp 720w, /img/dish/${suggestion.photoId}-1080.webp 1080w`}
            sizes="(max-width: 900px) 92vw, 44vw"
            alt={suggestion.name}
            loading="lazy"
            decoding="async"
            width={720}
            height={495}
          />
        ) : (
          /* The same honest empty frame the card uses — borrowing another
             dish's photograph is the one thing a guest would never forgive. */
          <span className={styles.noPhoto}>
            <span>{dict.menu.photoPending}</span>
          </span>
        )}

        {/* Said on the picture, where the price is read, not in a footnote. */}
        <span className={styles.chip}>{example ? dict.assistant.sample : dict.menu.demoLabel}</span>
        {suggestion.soldOut ? <span className={styles.soldOut}>{dict.menu.soldOut}</span> : null}
      </div>

      <div className={styles.plateBody}>
        <h2 className={styles.dishName}>
          <a href={href}>
            {suggestion.code ? <span className={styles.code}>{suggestion.code}</span> : null}
            {suggestion.name}
          </a>
          <span className={styles.price}>{formatMoney(suggestion.priceCents, locale)}</span>
        </h2>

        <p className={styles.variant}>{suggestion.variantLabel}</p>

        <div className={styles.plateFoot}>
          {/*
           * No allergen data has ever been supplied for this card, and the dish
           * page is where that is said plainly, so the way to it belongs beside
           * every price the guide quotes.
           */}
          <a href={href} className={styles.detailLink}>
            {dict.menu.allergensAndDetails}
            <span aria-hidden="true"> ↗</span>
          </a>

          {suggestion.soldOut ? (
            <span className={styles.variant}>{dict.menu.soldOut}</span>
          ) : suggestion.orderable ? (
            <button type="button" className={`cta ${styles.add}`} onClick={() => onAdd(suggestion)}>
              <span className={styles.addMark} aria-hidden="true">
                +
              </span>
              {dict.dish.addToCart}
            </button>
          ) : (
            <span className={styles.variant}>{dict.menu.dineInOnly}</span>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * The mark the guide wears, matching the one in the dock.
 *
 * A brain rather than a portrait: nobody at the restaurant has agreed to be the
 * face of a bot, and the same outline in the dock and on the card is what tells
 * a guest the two are the same thing.
 */
/*
 * Two lobes and their folds. The bare outline read as a circle with a line
 * through it at 28px, which is not a brain and not anything else either — the
 * folds are what make the mark legible at the size it is actually used.
 */
function BrainMark({ size = 24, className }: { size?: number; className?: string }) {
  const line = {
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M11.3 4.6a2.5 2.5 0 0 0-4.2 1.5 2.4 2.4 0 0 0-1.6 4.1 2.5 2.5 0 0 0 .5 4.2 2.5 2.5 0 0 0 2.6 3 2.4 2.4 0 0 0 2.7 1.6V4.6Z"
        {...line}
      />
      <path
        d="M12.7 4.6a2.5 2.5 0 0 1 4.2 1.5 2.4 2.4 0 0 1 1.6 4.1 2.5 2.5 0 0 1-.5 4.2 2.5 2.5 0 0 1-2.6 3 2.4 2.4 0 0 1-2.7 1.6V4.6Z"
        {...line}
      />
      <path d="M11.3 8.6H9.2M11.3 12.4H8.4M11.3 16H9.6" {...line} strokeWidth={1} />
      <path d="M12.7 8.6h2.1M12.7 12.4h2.9M12.7 16h1.7" {...line} strokeWidth={1} />
    </svg>
  );
}


function GuestMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.4" r="3.6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M4.8 19.6c1-3.6 3.8-5.6 7.2-5.6s6.2 2 7.2 5.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.4 3.6 3.2 10.3c-.8.3-.8 1.4 0 1.7l6.6 2.3 2.3 6.6c.3.8 1.4.8 1.7 0l6.7-17.2c.3-.7-.4-1.4-1.1-1.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="m9.9 14.2 4.2-4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
