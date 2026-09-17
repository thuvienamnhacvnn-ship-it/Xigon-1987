/**
 * Botanical line art.
 *
 * Drawn here rather than pulled in as a stock illustration: the mockup uses a
 * fine ink-drawn branch as its quiet decorative motif, and an SVG we own scales
 * to any rail width, inherits `currentColor`, and costs one request less.
 *
 * Purely decorative — always hidden from assistive technology.
 */

export function BotanicalBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 260" fill="none" className={className} aria-hidden="true">
      {/* main stem */}
      <path
        d="M62 258C62 210 58 176 48 148 38 120 30 96 30 62"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* side stems */}
      <path d="M52 176c14-8 24-22 28-42" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M44 132c-14-4-24-16-28-34" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M36 96c12-6 20-18 22-34" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />

      {/* leaves along the main stem */}
      {LEAVES.map((leaf, index) => (
        <path key={index} d={leaf} stroke="currentColor" strokeWidth="0.75" strokeLinejoin="round" />
      ))}

      {/* blossoms — five petals around a dotted centre */}
      {BLOSSOMS.map(([cx, cy, r], index) => (
        <g key={index}>
          {[0, 1, 2, 3, 4].map((petal) => {
            const angle = (petal / 5) * Math.PI * 2 - Math.PI / 2;
            const px = cx + Math.cos(angle) * r * 0.78;
            const py = cy + Math.sin(angle) * r * 0.78;
            return (
              <ellipse
                key={petal}
                cx={px}
                cy={py}
                rx={r * 0.52}
                ry={r * 0.38}
                stroke="currentColor"
                strokeWidth="0.7"
                transform={`rotate(${(angle * 180) / Math.PI} ${px} ${py})`}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={r * 0.2} fill="currentColor" />
        </g>
      ))}

      {/* a few loose seed heads */}
      <path d="M30 62c-4-8-4-16 0-24 4 8 4 16 0 24z" stroke="currentColor" strokeWidth="0.75" />
      <circle cx="30" cy="34" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Leaf outlines: a curved blade with a centre vein, mirrored down the stem. */
const LEAVES = [
  'M48 148c-14 2-24-4-30-16 12-6 24-2 30 16z',
  'M50 158c14 2 24-4 30-16-12-6-24-2-30 16z',
  'M42 118c-13 1-22-5-27-16 11-5 22-1 27 16z',
  'M44 110c13 1 22-5 27-16-11-5-22-1-27 16z',
  'M34 82c-11 1-19-5-23-14 9-4 19-1 23 14z',
  'M36 76c11 1 19-5 23-14-9-4-19-1-23 14z',
];

/** [cx, cy, radius] */
const BLOSSOMS: [number, number, number][] = [
  [80, 106, 9],
  [16, 98, 7],
  [58, 62, 8],
  [70, 132, 6],
];

/**
 * A carved name seal, the single red mark in the palette. The characters are
 * abstract strokes, not real hanzi — it reads as a stamp without pretending to
 * spell something it does not.
 */
export function Seal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 9h8M11 9v14M7 16h8M7 23h8M19 8v16M23 8v16M19 12h4M19 20h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}
