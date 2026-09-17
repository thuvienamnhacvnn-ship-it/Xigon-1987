'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './Assistant.module.css';
import { ChefAvatar } from './ChefAvatar';
import { formatMoney } from '@/lib/money';
import { hrefFor, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

const OPEN_EVENT = 'xigon:assistant-open';

/** Opens the guide from anywhere — the header, a section, a keyboard shortcut. */
export function openAssistant(prefill?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: prefill }));
}

export type Suggestion = {
  dishId: string;
  variantId: string;
  slug: string;
  code: string | null;
  name: string;
  variantLabel: string;
  priceCents: number;
  photoId: string | null;
  soldOut: boolean;
  orderable: boolean;
};

type Message =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; suggestions?: Suggestion[] };

/**
 * The menu guide.
 *
 * It answers only from the published catalogue — the server resolves every card
 * back to a real dish and price — and it never adds anything to the cart on its
 * own initiative. The guest presses the button.
 */
export function Assistant({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  const send = useCallback(
    async (text: string) => {
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
    },
    [busy, dict.assistant.limit, dict.assistant.unavailable, locale, threadId],
  );

  useEffect(() => {
    const onOpen = (event: Event) => {
      openerRef.current = document.activeElement;
      setOpen(true);
      const prefill = (event as CustomEvent<string | undefined>).detail;
      if (prefill) setTimeout(() => void send(prefill), 50);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [send]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        (openerRef.current as HTMLElement | null)?.focus?.();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function add(suggestion: Suggestion) {
    await fetch('/api/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dishId: suggestion.dishId, variantId: suggestion.variantId, quantity: 1, locale }),
    }).catch(() => undefined);
    window.location.assign(hrefFor(locale, 'cart'));
  }

  if (!open) {
    return (
      /*
       * The button alone. A teaser card used to sit beside it, and it covered
       * the banner and then every filter row underneath — a permanent panel is
       * not an invitation, it is an obstruction. The chef's face and the title
       * on the button say what it is.
       */
      <div className={styles.dock}>
        <button type="button" className={styles.launch} onClick={() => setOpen(true)} title={dict.assistant.teaser}>
          <span className={styles.ring} aria-hidden="true" />
          <ChefAvatar size={40} />
          <span className="visually-hidden">{dict.assistant.open}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.panel} role="dialog" aria-modal="false" aria-label={dict.assistant.role}>
      <header className={styles.head}>
        <ChefAvatar size={38} className={styles.headAvatar} />
        <span className={styles.headText}>
          <span className={styles.headName}>{dict.assistant.name}</span>
          <span className={styles.headRole}>{dict.assistant.role}</span>
        </span>
        <button
          type="button"
          className={styles.close}
          aria-label={dict.assistant.close}
          onClick={() => {
            setOpen(false);
            (openerRef.current as HTMLElement | null)?.focus?.();
          }}
        >
          ✕
        </button>
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
          <div key={index} className={message.role === 'user' ? styles.userMsg : styles.botMsg}>
            <p>{message.text}</p>

            {message.role === 'assistant' && message.suggestions?.length ? (
              <>
                <p className={styles.proposalLabel}>{dict.assistant.proposal}</p>
                <ul className={styles.cards}>
                  {message.suggestions.map((suggestion) => (
                    <li key={`${suggestion.dishId}-${suggestion.variantId}`} className={styles.dishCard}>
                      {suggestion.photoId ? (
                        <img
                          className={styles.dishThumb}
                          src={`/img/plate/${suggestion.photoId}-420.webp`}
                          alt=""
                          width={48}
                          height={48}
                        />
                      ) : (
                        <span className={styles.dishThumb} aria-hidden="true" />
                      )}

                      <span>
                        <a className={styles.dishName} href={hrefFor(locale, 'dish', { slug: suggestion.slug })}>
                          {suggestion.name}
                        </a>
                        <span className={styles.dishMeta}>
                          {suggestion.variantLabel} · {formatMoney(suggestion.priceCents, locale)}
                        </span>
                      </span>

                      {suggestion.soldOut ? (
                        <span className={styles.dishMeta}>{dict.menu.soldOut}</span>
                      ) : suggestion.orderable ? (
                        <button type="button" className={styles.addBtn} onClick={() => void add(suggestion)}>
                          {dict.menu.add}
                        </button>
                      ) : (
                        <span className={styles.dishMeta}>{dict.menu.dineInOnly}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className={styles.hint}>{dict.assistant.proposalHint}</p>
              </>
            ) : null}
          </div>
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
        <label htmlFor="assistant-input" className="visually-hidden">
          {dict.assistant.placeholder}
        </label>
        <input
          id="assistant-input"
          ref={inputRef}
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
    </div>
  );
}
