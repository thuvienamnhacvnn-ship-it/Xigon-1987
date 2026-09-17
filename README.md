# XIGON 1987

Website and ordering system for XIGON 1987, Nürnberger Str. 46, 10789 Berlin.

German is the primary language; English and Vietnamese are complete, with their
own URLs (`/de/speisekarte`, `/en/menu`, `/vi/menu`).

```bash
npm install
npm run db:reset     # create the database, apply migrations, load the menu
npm run dev          # http://localhost:3060
```

---

## What it does

| | |
|---|---|
| **Banner** | The restaurant's own dining-room photograph, with the dish on a separate transparent layer that rotates through five plates. Swapping the dish touches nothing else. |
| **Menu** | 21 dishes in 7 categories. Four signature plates on the home page; the rest as photograph, name and price, with a full page per dish. Search, category and dietary filters run in the browser. |
| **Dish page** | Photograph, description, ingredients, portions with prices, allergen statement, quantity, a note for the kitchen, add to basket. |
| **Table booking** | Availability computed live against tables, existing bookings and other guests' holds. Choosing a time takes a short hold on a specific table; the guest sees the countdown. Cancellation by link. |
| **Collection** | Basket, times limited by kitchen capacity per slot, checkout, an order page reachable only by its own link. |
| **Promotions** | Upload screen with image, three languages, run dates and a countdown on the home page. |
| **The house** | Room photographs with captions, and guest quotes when there are any to publish. |
| **Menu guide** | A chef-avatar assistant that answers only from the published card. Works without an API key by searching the same catalogue. |
| **Footer** | Drawn street plan, map on request, both published opening-hour sets with their sources. |
| **Back office** | `/de/admin` behind a password. The day's book in time order, table assignment, confirm / seated / done / no-show / cancel, internal notes, and bookings taken by phone or at the door. |
| **Booking platforms** | Quandoo, TheFork and any bridge service post into `/api/channels/<platform>`: signature checked, payload stored, duplicates dropped, a table allocated by the same rules as the website. |

---

## Decisions that are not obvious from the code

**Prices are demo prices.** The restaurant's old website and its old PDF card
give different figures for the same dishes — X1 is 9,50 € on one and 19,00 € on
the other — and nothing has been confirmed. The numbers in the database make the
basket, the receipts and the tax line work; every screen that shows a price also
shows `PRICE_NOTE` saying they are not the restaurant's card. `demoMode` is on
and no payment provider is connected.

**Allergens are never asserted.** No allergen data has ever been supplied. An
empty list renders as "please ask us", never as "contains nothing", and the
menu guide is instructed never to answer an allergen question.

**Opening hours are shown twice.** The old site publishes 11:00–23:00 on the
home page and 10:00–01:00 on the contact page. Both are shown with their source
rather than one being chosen. The booking engine runs on a placeholder schedule
flagged `confirmed: false`.

**The floor plan is a placeholder.** Twelve tables, every row
`confirmed: false`. Availability is real arithmetic against those tables; the
restaurant replaces them before launch.

**The Impressum is deliberately incomplete.** The old site named a person and a
tax number, unverified. Publishing an unverified Impressum is a false
declaration in the operator's name, so the page lists what is still needed
instead.

**Guest quotes need two gates.** `published` *and* `consentConfirmed`. Copying a
review site is not consent.

**Quandoo and TheFork are not connected — the plumbing for them is.** Both are
partner APIs: you sign an agreement, they issue credentials, and neither the
endpoints nor the payload format is public. Rather than invent field names that
would look right and be wrong, each adapter accepts one normalised payload, and
the screen at `/de/admin/kanaele` says so. Everything behind that payload is
finished and tested: HMAC signatures, replay protection by event id, update in
place by the platform's own booking id, table allocation, and the conflict rule
below. Today the working route is a bridge (Zapier, Make, n8n). When the partner
documentation arrives, only `parse` and `verify` in `src/server/channels/`
change.

**An outside booking always keeps its table.** A guest who booked on TheFork has
already been told yes by TheFork, and we cannot un-tell them. So an arriving
booking is recorded even when nothing is free — without a table, flagged, and
counted at the top of the day's list for a person to resolve. Dropping it or
silently double-booking are both worse than an awkward row in the book.

**No facade photograph exists.** None of the restaurant's own channels has one.
The banner uses the interior instead; the photos on review sites belong to their
photographers.

---

## Layout of the code

```
src/
  app/[locale]/            layout, home page, and one catch-all that dispatches
                           every other page by this locale's own slug
  app/api/assistant/       the menu guide's endpoint
  components/              the interface
  views/                   one file per page, rendered by the dispatcher
  server/                  menu, cart, reservations, orders, content, settings,
                           server actions — everything that touches the database
  server/channels/         booking platforms: adapters, signature checks, intake
  views/admin/             the back office
  db/                      drizzle schema and the PGlite handle
  lib/                     i18n, dictionaries, money, dates, restaurant facts
scripts/                   asset build, migrations, seed, smoke test
```

Prices are integer cents everywhere. The client sends ids and quantities; every
price, total and availability decision is made on the server and made again at
checkout.

---

## Things that will bite

**Inside a transaction, never touch the outer handle.** This has now cost two
afternoons. `db.transaction(async tx => { … })` holding PGlite's single
connection while any code inside it writes through `db` deadlocks: the outer
write waits for the transaction, the transaction waits for the write, and the
request never returns. Pass `tx` down, or do the work after the transaction has
returned.

**PGlite allows one writer.** Stop the dev server before `db:migrate`,
`db:seed` or `smoke`. Killing the dev server while it holds the data directory
can corrupt it — `npm run db:reset` rebuilds it.

**No native image binding.** Every image is pre-generated by
`npm run assets` (ffmpeg), and `images: { unoptimized: true }` is set. The
transparent dish cut-outs are made with an elliptical alpha falloff in ffmpeg —
see `scripts/build-assets.mjs`.

**Server actions and `useTransition`.** An awaited server action inside a
transition leaves `isPending` stuck true in React 19, which disables the whole
form. The forms here use a plain busy flag, and successful submits redirect from
the server rather than calling `router.push` from the client.

**`content-visibility: auto` is not used.** On a section thousands of pixels
tall it makes the page unscrollable: the placeholder height and the real height
differ enough that scrolling in resizes the page, which scrolls it back out.

---

## Before this goes live

- [ ] Confirm the menu, the prices and the allergen data with the restaurant
- [ ] Confirm the opening hours (the two published sets contradict each other)
- [ ] Supply the real floor plan and reservation duration
- [ ] Complete the Impressum, and have the privacy statement reviewed
- [ ] Settle the photographers' rights and the consent of the people photographed
- [ ] Commission a facade photograph
- [ ] Connect a payment provider, then switch `demoMode` off
- [ ] Set `XIGON_ADMIN_PASSWORD` — the back office does not open without it, and
      the promotions screen falls back to accepting changes from localhost only
- [ ] Sign the Quandoo and TheFork partner agreements, then set
      `QUANDOO_WEBHOOK_SECRET` and `THEFORK_WEBHOOK_SECRET`; until then use a
      bridge service with the same secrets
- [ ] Set `ANTHROPIC_API_KEY` if the menu guide should use a model rather than
      the built-in search
