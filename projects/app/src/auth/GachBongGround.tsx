/**
 * The gạch bông ground — the page texture under both auth screens.
 *
 * Backlog 0006: the login screen is the opening frame of a recording, and flat
 * cream is forgettable on camera. This is a Vietnamese encaustic-tile motif
 * (gạch bông) tiled across the whole viewport at a very low opacity — texture
 * you feel rather than a pattern that competes with the card.
 *
 * Three properties it is required to have:
 *
 *   - **It is a decoration and nothing else.** `aria-hidden`, no pointer events,
 *     behind everything (`-z-10` under the `isolate` on `AuthScreen`'s `<main>`).
 *     It cannot take focus, be read out, or intercept a click on the form.
 *   - **No colour literal** (documents/design-system.md §3.5). The motif is
 *     stroked in `currentColor`, and the only thing that sets `color` here is the
 *     `text-brand/5` utility — so the ink is `--brand` at 5% and it moves if the
 *     theme moves. The cream behind it is the page's own `bg-surface`.
 *   - **No network fetch.** The tile is inline SVG in this file, not an asset
 *     request that can fail or flash on a cold load.
 *
 * The motif itself is drawn once into an SVG `<pattern>` and stamped by a single
 * `<rect>`: one tile in the DOM however tall the page gets. The corner circles
 * are clipped by the tile box on purpose — four neighbouring tiles complete each
 * one, which is exactly how a real gạch bông floor reads.
 */

/** Stable id: only one auth screen is ever mounted, so it cannot collide. */
const PATTERN_ID = 'gach-bong-tile';

export function GachBongGround() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-decoration="gach-bong"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-brand/5"
    >
      <defs>
        <pattern id={PATTERN_ID} width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* The grout line: the tile grid itself. */}
            <path d="M0 0H64M0 0V64" />
            {/* Corner rosettes — each is completed by its three neighbours. */}
            <circle cx="0" cy="0" r="20" />
            <circle cx="64" cy="0" r="20" />
            <circle cx="0" cy="64" r="20" />
            <circle cx="64" cy="64" r="20" />
            {/* The quatrefoil at the heart of the tile. */}
            <circle cx="32" cy="19" r="13" />
            <circle cx="32" cy="45" r="13" />
            <circle cx="19" cy="32" r="13" />
            <circle cx="45" cy="32" r="13" />
            {/* The diamond that ties the four petals together, and the eye. */}
            <path d="M32 6 58 32 32 58 6 32Z" />
            <circle cx="32" cy="32" r="4.5" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${PATTERN_ID})`} />
    </svg>
  );
}
