/**
 * The chef the menu guide wears.
 *
 * Drawn as line art rather than a stock portrait: nobody at the restaurant has
 * agreed to be the face of a bot, and an illustration keeps the guide honestly
 * a piece of software while still being warm. It inherits `currentColor`, so it
 * works on cream and on navy without a second file.
 */
export function ChefAvatar({ className, size = 44 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* toque */}
      <path
        d="M18 27c-4.6 0-8-3.4-8-7.6 0-3.6 2.6-6.6 6.2-7.3C17 8.6 20.4 6 24.6 6c2.6 0 5 1 6.6 2.7C32.8 6.6 35.5 5.4 38.5 5.4c5.2 0 9.4 3.7 9.9 8.5 3.3.9 5.6 3.8 5.6 7.2 0 4.2-3.4 7.6-8 7.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 27h28v5H18z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      {/* pleats */}
      <path d="M25 13v13M32 10v16M39 13v13" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.55" strokeLinecap="round" />

      {/* face */}
      <path
        d="M22 32v5a10 10 0 0 0 20 0v-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M28.5 39.5h.02M35.5 39.5h.02" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M29.5 45c1.6 1.2 3.4 1.2 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />

      {/* collar and neckerchief */}
      <path
        d="M24 48.5 32 54l8-5.5M16 62c1.6-6 7-9.6 16-9.6s14.4 3.6 16 9.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M32 54v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.6" />
    </svg>
  );
}
