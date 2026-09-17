# Geometry measured off the mockups

Numbers, not impressions. Judging a layout by eye from a picture is how a panel
that should be 76% of the window ends up at 95%, and everything on it inflates
to match — which is the single complaint that has come back most often.

Measured with `node scripts/measure-mockup.mjs <image>`. It finds the panel
edges as a step in average brightness across a band of rows or columns, which
survives the candles and neon in the photographs behind.

Sources: `E:\Works\PTC\Xigon 1987\1.png` … `8.png`, each 1672 × 941.

## The band every screen sits in

| | share of the window |
|---|---|
| top of content | **11 %** |
| bottom of content | **83.5 %** |
| dock centre | 91 % |
| footer line | 96 % |

The shell keeps this clear as padding — `--shell-top` and `--shell-bottom` — so
no screen has to know about the bar or the dock.

## Width, per screen

The content band is **not** one width. Each screen has its own, and forcing them
all to the narrowest is what made the cards look cramped and the type oversized.

| screen | mockup | left | right | width | at 1920 |
|---|---|---|---|---|---|
| Speisekarte | 2 | 12.1 % | 87.9 % | **75.8 %** | 1455 px |
| Warenkorb — the **Bestellen** tab | 3 | 15.2 % | 84.8 % | 69.6 % | 1336 px |
| Checkout | 4 | 22.3 % | 77.8 % | 55.5 % | 1066 px |
| Reservieren | 5 | 3.1 % | 96.8 % | **93.7 %** | 1800 px |
| Angebote | 6 | 7.4 % | 92.9 % | **85.5 %** | 1642 px |
| KI-Berater | 7 | 8.6 % | 91.4 % | **82.8 %** | 1590 px |
| Kontakt | 8 | 7.5 % | 92.5 % | **85.0 %** | 1632 px |

## Read the dock before the panel

Every drawing lights one item in the dock, and that says which tab the screen
belongs to. Drawing 3 lights **Bestellen** and the pill above it reads
Bestellen — so the basket *is* the Bestellen screen, not a separate page behind
it. That was missed once, and the cost was a Bestellen tab built as two picture
cards explaining that takeaway exists while the drawing of the real screen sat
unread. Check the lit dock item first; it is the cheapest fact in the picture.

## Inside the screens

**Speisekarte (2).** Panel padding 26 px at 1672 ≈ 30 px at 1920. Dish
photograph 400 × 255 → **aspect 16 : 10**, and 37 % of the panel's height — a
photograph given a `1fr` row instead grows with the window until a plate of
sushi is the size of a table. Gap between cards 28 px ≈ 1.7 %.

**Warenkorb / Bestellen (3).** Panel 1336 × 674 at 1920. Two columns, the lines
against the card beside them at **1 : 0.44** — the card is 398 px, 30 % of the
panel. A dish photograph is **233 × 157** (≈ 3 : 2), and it is sized against the
window's *height* as well as its width: tied to width alone it keeps its full
height on a short laptop screen and pushes the second line under the fold. The
stepper is a 166 × 46 pill. Rows are separated by a hairline, not boxed.

**Reservieren (5).** Split down the middle: the photograph runs 3.1 % → 49 %,
the form panel 49.1 % → 96.8 %. Both share the panel radius.

**KI-Berater (7).** Two separate cards, 8.6 % → 49.3 % and 50.6 % → 91.4 %, so
each is 40.7 % with a 1.3 % gap. No wrapping panel.

**Angebote (6).** Three separate cards across 7.4 % → 92.9 %, no wrapping panel,
title sitting directly on the photograph above them.

**Kontakt (8).** One panel, three columns, and the site footer as a row inside
the panel rather than under it.

## The glass

Dark first, translucent second. The restaurant behind is full of lit signs and
candles; at 50 % opacity they burn straight through and the prices end up in the
middle of a neon sign. `.glass` in `base.css` is the single definition.
