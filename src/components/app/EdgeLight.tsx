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
const PASSES = [
  { lit: 34, opacity: 0.1, width: 3.5 },
  { lit: 22, opacity: 0.2, width: 2.4 },
  { lit: 12, opacity: 0.45, width: 1.6 },
  { lit: 5, opacity: 0.95, width: 1.2 },
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
            /*
             * Each pass is pulled back by half its own length so all four share
             * a centre. Aligned at their leading edges instead, the glow would
             * trail the bright head like a comet tail — which is a different
             * effect, and not the one a reflection makes.
             */
            ['--centre' as string]: String((34 - pass.lit) / 2),
          }}
        />
      ))}
    </svg>
  );
}
