import styles from './Ornament.module.css';

/**
 * Gold line-work, drawn rather than fetched.
 *
 * The screens are glass panels with type on them, and a panel with nothing in
 * its corners reads as a dialogue box. These are the same language as the rest
 * of the site — a hairline, a curve, a small seal — at an opacity that puts
 * them behind the words rather than beside them.
 *
 * They are SVG paths in the component, not image files: at this weight a PNG
 * would either band on the gradient behind it or need three sizes, and the
 * whole set weighs less than one of them.
 */
export function Ornament({ kind, className }: { kind: OrnamentKind; className?: string }) {
  const Shape = SHAPES[kind];
  return (
    <span className={`${styles.ornament} ${className ?? ''}`} aria-hidden="true">
      <Shape />
    </span>
  );
}

export type OrnamentKind = 'corner' | 'branch' | 'rule' | 'seal';

const stroke = {
  stroke: 'currentColor',
  fill: 'none',
  strokeWidth: 1,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** A bracket for the corner of a panel, in the manner of a printed menu. */
function Corner() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120">
      <path d="M2 40V14a12 12 0 0 1 12-12h26" {...stroke} />
      <path d="M10 46V22a12 12 0 0 1 12-12h24" {...stroke} strokeWidth={0.6} />
      <path d="M2 74c14 0 22-8 22-22" {...stroke} strokeWidth={0.6} />
      <circle cx="30" cy="30" r="2.4" {...stroke} />
    </svg>
  );
}

/**
 * A branch of blossom.
 *
 * The restaurant's own rooms have orchids on every table and a bamboo wall at
 * the back; this is that, reduced to a line.
 */
function Branch() {
  return (
    <svg viewBox="0 0 220 300" width="220" height="300">
      <path d="M206 6c-38 26-66 58-84 96-18 38-26 84-24 138" {...stroke} />
      <path d="M170 44c-22 2-40 12-54 30" {...stroke} strokeWidth={0.7} />
      <path d="M140 96c-20 6-34 18-42 36" {...stroke} strokeWidth={0.7} />
      <path d="M118 158c-16 10-26 24-30 42" {...stroke} strokeWidth={0.7} />
      {[
        [188, 26],
        [152, 74],
        [126, 132],
        [104, 204],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse key={angle} cx="0" cy="-7" rx="3.4" ry="7" transform={`rotate(${angle})`} {...stroke} strokeWidth={0.7} />
          ))}
          <circle cx="0" cy="0" r="1.5" fill="currentColor" stroke="none" />
        </g>
      ))}
    </svg>
  );
}

/** A divider: a hairline with a diamond at its middle. */
function Rule() {
  return (
    <svg viewBox="0 0 240 12" width="240" height="12" preserveAspectRatio="none">
      <path d="M0 6h96M144 6h96" {...stroke} />
      <path d="M120 1.5 126 6l-6 4.5L114 6Z" {...stroke} />
      <circle cx="104" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="136" cy="6" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** A small round seal, for the head of a section. */
function Seal() {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64">
      <circle cx="32" cy="32" r="30" {...stroke} strokeWidth={0.7} />
      <circle cx="32" cy="32" r="24" {...stroke} />
      <path d="M32 12v40M12 32h40" {...stroke} strokeWidth={0.5} />
      <path d="M32 20c6 6 6 18 0 24-6-6-6-18 0-24Z" {...stroke} strokeWidth={0.7} />
    </svg>
  );
}

const SHAPES: Record<OrnamentKind, () => React.ReactElement> = {
  corner: Corner,
  branch: Branch,
  rule: Rule,
  seal: Seal,
};
