'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './AssistantBoard.module.css';
import { ChefAvatar } from '@/components/ChefAvatar';
import type { Suggestion } from '@/components/Assistant';
import { formatMoney } from '@/lib/money';
import { hrefFor, type Locale } from '@/lib/i18n';
import { PRICE_NOTE } from '@/lib/price-note';
import type { Dictionary } from '@/lib/dictionary';

type Message =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; suggestions?: Suggestion[] };

/**
 * KI-Berater.
 *
 * The same guide as the floating panel, given the whole screen: the talking on
 * the left, the plates it named on the right. Splitting them is the point — in
 * the panel a suggestion scrolls out of sight the moment the next question is
 * asked, and a guest comparing three dishes had to scroll back for the prices.
 *
 * Every card here was resolved by the server against the published catalogue,
 * so the name, the variant and the price are the card's own. Nothing is added
 * to a basket unless the guest presses the button.
 */
export function AssistantBoard({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  // A plain boolean, not a transition: awaiting a request inside startTransition
  // leaves this screen pending forever, which this project has already paid for.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  const logRef = useRef<HTMLDivElement>(null);

  // The right column follows the latest proposal; an older one still readable
  // in the log would be answering a question the guest has moved on from.
  const shown = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role === 'assistant' && message.suggestions?.length) return message.suggestions;
    }
    return [];
  }, [messages]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    setMessages((prev) => [...prev, { role: 'user', text: question }]);
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
      setMessages((prev) => [...prev, { role: 'assistant', text: body.answer, suggestions: body.suggestions }]);
    } catch {
      // A provider outage must never take the menu with it.
      setError(dict.assistant.unavailable);
    } finally {
      setBusy(false);
    }
  }

  async function add(suggestion: Suggestion) {
    await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishId: suggestion.dishId, variantId: suggestion.variantId, quantity: 1, locale }),
    }).catch(() => undefined);
    window.location.assign(hrefFor(locale, 'cart'));
  }

  return (
    <div className={styles.board}>
      {/* ---------- the conversation ---------- */}
      <section className={styles.talk} aria-label={dict.assistant.role}>
        <header className={styles.head}>
          <ChefAvatar size={40} className={styles.headAvatar} />
          <span className={styles.headText}>
            <span className={styles.headName}>{dict.assistant.name}</span>
            <span className={styles.headRole}>{dict.assistant.role}</span>
          </span>
        </header>

        <div className={styles.log} ref={logRef} role="log" aria-live="polite">
          {messages.length === 0 ? (
            <>
              <p className={styles.intro}>{dict.assistant.intro}</p>
              <div className={styles.prompts}>
                {dict.assistant.prompts.map((prompt) => (
                  <button key={prompt} type="button" className={styles.prompt} onClick={() => void send(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {messages.map((message, index) => (
            <p key={index} className={message.role === 'user' ? styles.userMsg : styles.botMsg}>
              {message.text}
            </p>
          ))}

          {busy ? <p className={styles.intro}>{dict.assistant.thinking}</p> : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
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
            value={input}
            maxLength={400}
            autoComplete="off"
            placeholder={dict.assistant.placeholder}
            onChange={(event) => setInput(event.target.value)}
          />
          <button type="submit" className={styles.send} disabled={busy || !input.trim()}>
            {dict.assistant.send}
          </button>
        </form>

        <p className={styles.foot}>{dict.assistant.disclaimer}</p>
      </section>

      {/* ---------- the plates it named ---------- */}
      <section className={styles.proposal} aria-label={dict.assistant.proposal}>
        <h2 className={styles.proposalTitle}>{dict.assistant.proposal}</h2>

        {shown.length ? (
          <ul className={styles.dishes}>
            {shown.map((suggestion) => (
              <DishCard
                key={`${suggestion.dishId}-${suggestion.variantId}`}
                locale={locale}
                dict={dict}
                suggestion={suggestion}
                onAdd={add}
              />
            ))}
          </ul>
        ) : (
          /* An empty frame with nothing in it reads as broken; this says why it
             is empty and what to do about it. */
          <div className={styles.waiting}>
            <ChefAvatar size={56} className={styles.waitingAvatar} />
            <p className={styles.waitingText}>{dict.assistant.teaser}</p>
          </div>
        )}

        <p className={styles.note}>
          {dict.assistant.proposalHint} {PRICE_NOTE[locale]}
        </p>
      </section>
    </div>
  );
}

function DishCard({
  locale,
  dict,
  suggestion,
  onAdd,
}: {
  locale: Locale;
  dict: Dictionary;
  suggestion: Suggestion;
  onAdd: (suggestion: Suggestion) => void;
}) {
  const href = hrefFor(locale, 'dish', { slug: suggestion.slug });

  return (
    <li className={styles.card} data-sold-out={suggestion.soldOut ? 'true' : undefined}>
      <a href={href} className={styles.photo}>
        {suggestion.photoId ? (
          <img
            src={`/img/dish/${suggestion.photoId}-720.webp`}
            srcSet={`/img/dish/${suggestion.photoId}-480.webp 480w, /img/dish/${suggestion.photoId}-720.webp 720w, /img/dish/${suggestion.photoId}-1080.webp 1080w`}
            sizes="(max-width: 900px) 30vw, 16vw"
            alt={suggestion.name}
            loading="lazy"
            decoding="async"
            width={720}
            height={540}
          />
        ) : (
          /* The same honest empty frame the card uses — borrowing another
             dish's photograph is the one thing a guest would never forgive. */
          <span className={styles.noPhoto}>
            <span>{dict.menu.photoPending}</span>
          </span>
        )}

        {suggestion.soldOut ? <span className={styles.soldOut}>{dict.menu.soldOut}</span> : null}
      </a>

      <div className={styles.body}>
        <h3 className={styles.name}>
          <a href={href}>
            {suggestion.code ? <span className={styles.code}>{suggestion.code}</span> : null}
            {suggestion.name}
          </a>
        </h3>
        <p className={styles.variant}>{suggestion.variantLabel}</p>

        <div className={styles.cardFoot}>
          <p className={styles.price}>{formatMoney(suggestion.priceCents, locale)}</p>
          {suggestion.soldOut ? null : suggestion.orderable ? (
            <button type="button" className={styles.addBtn} onClick={() => onAdd(suggestion)}>
              {dict.menu.add}
            </button>
          ) : (
            <span className={styles.variant}>{dict.menu.dineInOnly}</span>
          )}
        </div>
      </div>
    </li>
  );
}
