import styles from './EdgeLight.module.css';

/**
 * A light that runs along the edge of a panel — and round its corners.
 *
 * The first attempt did this in pure CSS, with a long straight bar walking the
 * border box via `offset-path`. It followed the straights perfectly and then
 * cut every corner, because a rigid bar cannot bend: at each corner the light
 * left the line and struck across the curve. On a panel whose whole character
 * is a thin gold edge, that is the one place the eye is already looking.
 *
 * A stroked path bends by definition. This is the same rounded rectangle the
 * panel is, drawn as an SVG outline with a dash pattern that travels along it —
 * so the lit length is measured *along the line*, corners included, and cannot
 * leave it.
 *
 * Four passes rather than one. A single dash is a bright worm; the glow is what
 * makes it light, and it is built from progressively longer, fainter dashes
 * sharing the same head. `pathLength="100"` normalises the geometry so every
 * dash length below is a percentage of the perimeter, whatever the panel's size
 * or aspect — one set of numbers for a card and for a screen-wide sheet.
 */
/*
 * The lit lengths are a share of the perimeter, and they have to stay well
 * under the spacing between lights.
 *
 * With one light a 34% glow was a long soft comet. With three lights a third of
 * the perimeter apart, a 34% glow reaches exactly as far as the next light —
 * so the three joined up and the whole edge was lit all the time. That is not
 * three lights travelling, it is a stationary multi-coloured border, and it
 * looked like a fault. Halved, each light covers about half the gap to the next
 * and there is dark line between them, which is the only thing that makes them
 * read as moving.
 */
const PASSES = [
  { lit: 15, opacity: 0.12, width: 3.5 },
  { lit: 9.5, opacity: 0.24, width: 2.4 },
  { lit: 5, opacity: 0.5, width: 1.6 },
  { lit: 2.2, opacity: 1, width: 1.2 },
];

/*
 * Three lights, not one, spaced a third of the way apart around the edge.
 *
 * One near-white light said nothing about the restaurant. Three — terracotta,
 * rose and green — put the whole palette in motion on every panel of the site,
 * which is the one piece of decoration here that is always visible and never in
 * the way of a word. They are a third apart so that at any moment one of them
 * is on a long side, and they never bunch into what would look like a single
 * fat light.
 *
 * The green is the forest lifted until it reads as light. A colour this dark
 * cannot glow; at #0a3d2a the third light was a dark patch travelling round a
 * dark edge, which is the opposite of the effect.
 */
const LIGHTS = [
  { colour: 'var(--accent)', at: 0 },
  { colour: 'var(--accent-soft)', at: 33.33 },
  { colour: 'var(--forest-lit)', at: 66.66 },
];

export function EdgeLight({ radius }: { radius?: string }) {
  return (
    /*
     * The corner radius is set through CSS, not the `rx` attribute.
     *
     * An SVG presentation attribute is not a CSS declaration: `rx="var(--glass-r)"`
     * does not resolve, it is simply invalid, and the rectangle falls back to
     * square corners. The light then ran a sharp-cornered path around a rounded
     * panel and left the line at every corner — which looked exactly as wrong
     * as it was. `rx` is also a CSS property, and there the variable works.
     */
    <svg
      className={styles.light}
      style={radius ? ({ ['--edge-r' as string]: radius }) : undefined}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      {LIGHTS.flatMap((light) =>
        PASSES.map((pass) => (
          <rect
            key={`${light.at}-${pass.lit}`}
            className={styles.pass}
            x="0.5"
            y="0.5"
            width="calc(100% - 1px)"
            height="calc(100% - 1px)"
            pathLength={100}
            strokeDasharray={`${pass.lit} ${100 - pass.lit}`}
            style={{
              opacity: pass.opacity,
              strokeWidth: pass.width,
              stroke: light.colour,
              /*
               * Each pass is pulled back by half its own length so all four
               * share a centre, then the whole group is pushed round the path by
               * its light's share. Aligned at their leading edges instead, the
               * glow would trail the bright head like a comet tail — a different
               * effect, and not the one a reflection makes.
               */
              ['--centre' as string]: String((15 - pass.lit) / 2 + light.at),
            }}
          />
        )),
      )}
    </svg>
  );
}
