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
 * One light, in one colour.
 *
 * It was three — terracotta, rose and green — chasing each other round every
 * panel, on the reasoning that it put the palette in motion. On the screen it
 * read as fairground bulbs: three saturated colours circling every box on the
 * site at once. A reflection is one colour and there is one of it; the moment
 * there are three, the eye stops reading light and starts reading decoration,
 * and decoration that moves is the least expensive-looking thing a page can do.
 *
 * The palette has plenty of presence elsewhere — the bar, the category pills,
 * the badges, the labels. The edge does not have to carry it too.
 *
 * Five passes, not four, and the brightest never reaches full strength. A dash
 * at opacity 1 is a bright worm crawling the border; at 0.55 with a long faint
 * falloff behind it, the same thing reads as the sheen travelling along a piece
 * of glass, which is what it is meant to be.
 */
const PASSES = [
  { lit: 26, opacity: 0.05, width: 6 },
  { lit: 18, opacity: 0.09, width: 4 },
  { lit: 11, opacity: 0.16, width: 2.6 },
  { lit: 6, opacity: 0.3, width: 1.6 },
  { lit: 2.5, opacity: 0.55, width: 1.1 },
];

/** The longest pass, and what the others are centred against. */
const SPREAD = PASSES[0].lit;

/*
 * One circuit. Slow: this is a sheen, not a signal, and a light that laps the
 * panel every few seconds is a page asking to be looked at instead of read.
 */
const CYCLE_SECONDS = 22;

const LIGHT_COLOUR = 'var(--accent-lit)';

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
      {PASSES.map((pass) => (
        <rect
          key={pass.lit}
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
            stroke: LIGHT_COLOUR,
            /*
             * Where this stroke starts along the path, expressed as a phase.
             *
             * Each pass is pulled back by half its own length so they share a
             * centre — aligned at their leading edges instead, the glow would
             * trail the bright head like a comet tail, which is a different
             * effect and not the one a reflection makes.
             *
             * It is a negative delay rather than a starting value because a
             * keyframe cannot carry a custom property and still be interpolated;
             * see the note in the stylesheet, which this project paid for with a
             * light that sat perfectly still while reporting itself as running.
             */
            animationDelay: `${-CYCLE_SECONDS * ((SPREAD - pass.lit) / 2 / 100)}s`,
          }}
        />
      ))}
    </svg>
  );
}
