/**
 * The gạch bông ground — the page texture this product sits on.
 *
 * A Vietnamese encaustic-tile motif (gạch bông), tiled across the page at a very
 * low opacity: texture you feel rather than a pattern that competes with the
 * content. Backlog 0006 put it behind the auth screens; **backlog 0007 carried
 * it into the signed-in app**, so the walkthrough does not cross a visual seam
 * the moment it signs in.
 *
 * **It moved out of `src/auth/` in 0007**, when `AppShell` became its second
 * consumer — the promotion rule in documents/coding-conventions.md, applied when
 * the second consumer actually existed rather than in advance.
 *
 * Properties it is required to have, on every screen:
 *
 *   - **It is a decoration and nothing else.** `aria-hidden`, `focusable="false"`,
 *     no pointer events, and behind everything at `-z-10`. It cannot take focus,
 *     be read out, or intercept a click. **Its parent must establish a stacking
 *     context** (`relative isolate`) or `-z-10` escapes and lands under the
 *     parent's own background — see the note on `density` below and both call
 *     sites.
 *   - **No colour literal** (documents/design-system.md §3.5). The motif is
 *     stroked in `currentColor`, and the only thing that sets `color` is one of
 *     the two utilities in `TONE` below — so the ink is `--brand` at a low alpha
 *     and it moves if the theme moves. The cream behind it is the page's own
 *     `bg-surface`.
 *   - **No network fetch.** The tile is inline SVG in this file, not an asset
 *     request that can fail or flash on a cold load.
 *
 * **`[overflow-anchor:none]` is not optional, and it cost a real regression to
 * find.** Mounting this in `AppShell` broke `phase4-edit-delete.spec.ts` — "a
 * saved edit keeps the row where the reader was looking" — 3 runs in 6, always
 * by 24px. The cause: this layer is `absolute inset-0` on a container whose
 * height is the whole scrollable document, so Chromium's native scroll anchoring
 * picked THIS element as its anchor. When an edit re-sorts a row into another
 * day group the document height changes, the browser "corrected" the scroll to
 * hold a full-page decoration still, and that fought the ledger's own anchor
 * (`src/lib/row-anchor.ts`) which was already holding the right row.
 *
 * Measured, not guessed: 12/12 green without this component mounted, 3/6 red
 * with it, 8/8 green with it plus this property — and the same distribution of
 * starting positions as the baseline, so the behaviour is restored rather than
 * papered over. A decoration must never be the browser's scroll anchor.
 *
 * The motif is drawn once into an SVG `<pattern>` and stamped by a single
 * `<rect>`: one tile in the DOM however tall the page gets. The corner circles
 * are clipped by the tile box on purpose — four neighbouring tiles complete each
 * one, which is how a real gạch bông floor reads.
 *
 * **`absolute`, not `fixed`** (backlog 0007 decision). Login never scrolls but
 * the ledger does, so this is a real choice, and `absolute` wins on two grounds:
 * it sizes to the SCROLL height of its parent, so a long ledger never runs off
 * the texture onto bare cream; and it renders correctly in the `fullPage`
 * screenshots that are this workspace's evidence medium, where a `fixed` layer
 * paints one viewport and leaves the rest of the shot flat. At these opacities
 * the "does the floor slide or hold still" difference is imperceptible, which
 * leaves document-coverage and honest evidence as the only real criteria.
 */

import { useId } from 'react';

/**
 * How much content the tile has to sit under. It decides the OPACITY and nothing
 * else — there is no second motif and no second component.
 *
 * `sparse` is the auth screens: one card on an otherwise empty page, where the
 * tile is most of what is on screen and can afford to be seen.
 *
 * `dense` is the signed-in shell: rows, panels, a month band, the category ramp
 * and the `uncat-hatch` texture, all competing at once. Tuned on `/ledger`
 * against the seeded data (backlog 0007), which is the busiest screen the app
 * has — anything that reads as texture there reads as texture everywhere.
 *
 * Both values are written as literal class strings so Tailwind's scanner can see
 * them; a class assembled at runtime would not be generated.
 */
export type GroundDensity = 'sparse' | 'dense';

const TONE: Record<GroundDensity, string> = {
  sparse: 'text-brand/5',
  dense: 'text-brand/3',
};

export function GachBongGround({ density = 'sparse' }: { readonly density?: GroundDensity } = {}) {
  /**
   * Unique per instance. The id used to be a module-level constant justified by
   * "only one auth screen is ever mounted" — a claim about the shape of the
   * route tree, which 0007 made harder to check and which nothing enforces. This
   * needs no such claim.
   *
   * The strip is not cosmetic: `useId` returns a value containing punctuation
   * (`«r0»` on React 19), and while a fragment reference tolerates it, an id made
   * only of `[a-z0-9-]` is one less thing to be clever about.
   */
  const instanceId = `gach-bong-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-decoration="gach-bong"
      data-ground-density={density}
      className={`pointer-events-none absolute inset-0 -z-10 h-full w-full [overflow-anchor:none] ${TONE[density]}`}
    >
      <defs>
        <pattern id={instanceId} width="64" height="64" patternUnits="userSpaceOnUse">
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
      <rect width="100%" height="100%" fill={`url(#${instanceId})`} />
    </svg>
  );
}
