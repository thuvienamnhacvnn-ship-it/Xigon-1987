# Looking at the phone layout

The browser this project is developed against cannot be resized below the
desktop window, so a phone layout cannot be checked by dragging the window
narrower. `scripts/phone-preview.html` renders three 390 × 844 iframes of the
running site side by side, which gives the real layout at the real width — the
media queries inside an iframe answer to the iframe's own viewport.

It lives in `scripts/` rather than in `public/` on purpose: everything under
`public/` is served to guests, and a developer's harness has no business on a
restaurant's website.

To use it, copy it into the served tree for as long as you need it, then take
it out again:

```sh
cp scripts/phone-preview.html public/img/_phone.html
# http://localhost:3060/img/_phone.html?a=/de/speisekarte&b=/de/bestellen&c=/de/kontakt
rm public/img/_phone.html
```

It has to go under `public/img/` and not at the root: `src/proxy.ts` pushes a
locale in front of any path that is not in its exclusion list, so `/x.html`
becomes `/de/x.html` and answers 404. `img` is on that list.

## What to check at 390px

- No sideways scroll on the page itself. Measure it rather than trusting the
  eye: `document.scrollingElement.scrollWidth` must equal `innerWidth`.
- Nothing overlapping. A screenshot hides this when two dark elements sit on
  each other — compare `getBoundingClientRect()` of the pair instead.
- Nothing clipped: an element whose `scrollHeight` exceeds its `clientHeight`
  inside an `overflow: hidden` box has lost content off the bottom, and that is
  usually a button.
- Tap targets at least 40px.
- The bottom bar and the round card button stay put while a screen scrolls
  inside itself.

## Two traps this project has actually paid for

**`aspect-ratio` on a picture that shares a box with text.** The picture takes
its height from its width, so on a wide card it grows until it has eaten the
row meant for the words. Hit three times — in Bestellen, in Angebote and in the
guide. Use an explicit `height: clamp(...)`.

**`1fr` grid columns.** A `1fr` column's automatic minimum is its min-content
width, so one unbreakable pill widens the whole grid and pushes the rest off
the side of the screen — where `overflow: hidden` then makes it unreachable
rather than merely ugly. Always `minmax(0, 1fr)`.
