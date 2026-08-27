/**
 * The rendered failure.
 *
 * Hub ticket 0003 phase 2: wrong credentials must produce "a realistic failure
 * the form actually renders (not a silent no-op)". So this component exists,
 * takes the machine-readable code, and renders the Vietnamese copy mapped to it
 * in `src/copy/strings.ts` — never the API's developer-facing English.
 *
 * `data-auth-error` carries the raw code onto the DOM, which is what turns "the
 * error is rendered" from a claim into one greppable attribute.
 */

import { authErrorCopy, authErrorFallback } from '../copy/strings';

export function AuthError({ code }: { readonly code: string | null }) {
  if (code === null) return null;

  return (
    <p
      role="alert"
      data-auth-error={code}
      className="rounded-row border border-outflow/30 bg-outflow/5 px-3 py-2 text-sm text-outflow"
    >
      {authErrorCopy[code] ?? authErrorFallback}
    </p>
  );
}
