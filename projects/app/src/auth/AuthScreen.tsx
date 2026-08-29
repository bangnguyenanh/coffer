/**
 * The card the two unauthenticated screens share.
 *
 * Promoted to a shared piece only because a second consumer exists (sign up and
 * login), per documents/coding-conventions.md. It owns layout and the product
 * name — ADR 0002: the shell, the browser title and the login screen all carry
 * **Coffer**, with no placeholder.
 *
 * The `footer` slot is where each screen points at the other one. It sits
 * OUTSIDE the `<form>` and under a divider on purpose: the Owner asked for the
 * cross-link to be "real and obvious, not fine print", and a link buried inside
 * the form reads as a hint attached to the last field rather than as the other
 * half of the pair.
 *
 * **Theme C (ticket 0005):** cream ground, a 16px panel, an ochre wordmark. The
 * fields themselves are shadcn primitives now (`Input`, `Label`, `Button`), so
 * the two forms inherit focus rings and spacing from the vocabulary instead of
 * from a pair of class constants that used to live here.
 *
 * **Staging (backlog 0006).** Two decorations were added around the card, and
 * the word AROUND is the whole boundary of that ticket: the form, its fields,
 * its error, its cross-link and its prefill are byte-for-byte what they were.
 *
 *   - `GachBongGround` — the encaustic-tile texture, on BOTH screens. It moved
 *     to `src/components/` in backlog 0007 when `AppShell` became its second
 *     consumer; the auth screens keep the `sparse` default, which is the
 *     value tuned here.
 *   - `ReceiptPanel` — the till-paper slab, on `/login` ONLY.
 *
 * **The wordmark (Owner directive, added to 0006 mid-execution).** It was 21px
 * sitting quietly above the title; it is now the ANCHOR of the frame — 44px,
 * `leading-none`, tracking pulled to `-0.035em` because letter-spacing that
 * reads as tight at 21px reads as loose at 44, still `text-brand`. ADR 0002 has
 * always said the login screen carries **Coffer** with no placeholder; this is
 * that, at the size the claim deserves. It is here rather than in either view
 * for the same reason the split is, so sign up inherits it — intended.
 *
 * **`font-bold` (700) IS the heaviest weight available**, not a soft choice:
 * `src/index.css` requests Be Vietnam Pro at 400;500;600;700, so `font-extrabold`
 * would be a browser-synthesised faux weight, which is worse at 44px than a real
 * 700. Adding 800 to the font request is a design-system change, not a class.
 *
 * **No tagline under it.** `appCopy.tagline` ("Sổ chi tiêu cá nhân") exists and
 * stays unused here on purpose: a second line directly under the wordmark splits
 * exactly the weight the directive asked to concentrate, and it would put "sổ
 * chi tiêu" on screen twice within 40px, since the login subtitle already reads
 * "Mở sổ chi tiêu của bạn."
 *
 * **Why the receipt is login-only, decided here rather than passed in.** Two
 * reasons, and the second is the real one. (1) Sign up's card is three fields
 * plus a hint, so a fixed receipt beside it either stretches or sits misaligned
 * against a taller card. (2) The receipt shows a filled expense book, which is a
 * true promise to somebody signing back INTO their ledger and a fiction beside
 * "create an account" — the person reading that screen has no rows yet.
 *
 * It branches on `view` instead of taking an `aside` prop because episode 2
 * rewrites the auth internals, and this keeps `LoginView` and `SignupView`
 * untouched by staging: the two files that rewrite are the two files that did
 * not change. Layout is already this component's job, and which screen is being
 * dressed is a layout fact. If a THIRD auth screen ever appears, promote it to a
 * prop then — not in advance.
 */

import type { FormEvent, ReactNode } from 'react';
import { appCopy } from '../copy/strings';
import { GachBongGround } from '../components/GachBongGround';
import { ReceiptPanel } from './ReceiptPanel';

interface AuthScreenProps {
  /** Rendered as `data-view`; the verification harness keys off it. */
  readonly view: 'signup' | 'login';
  readonly title: string;
  readonly subtitle: string;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly children: ReactNode;
  /** The link to the other screen. Not optional — the pair is the point. */
  readonly footer: ReactNode;
}

export function AuthScreen({ view, title, subtitle, onSubmit, children, footer }: AuthScreenProps) {
  return (
    <main
      data-view={view}
      data-status="ready"
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-12"
    >
      <GachBongGround />

      {/* The split. Below `lg` the receipt is `hidden`, so this collapses to a
          single centred card of exactly the width it has always been — the form
          is never the thing that shrinks (backlog 0006 phase 3). */}
      <div className="flex w-full max-w-3xl items-center justify-center gap-12">
        <div className="panel w-full max-w-sm p-8">
          <p
            data-wordmark={appCopy.name}
            className="text-[44px] leading-none font-bold tracking-[-0.035em] text-brand"
          >
            {appCopy.name}
          </p>
          <h1 className="mt-8 text-xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            {children}
          </form>

          <p className="mt-6 border-t border-rule pt-5 text-center text-sm text-ink-muted">
            {footer}
          </p>
        </div>

        {view === 'login' ? <ReceiptPanel /> : null}
      </div>
    </main>
  );
}

/** The one style the two cross-links share, so neither can become fine print. */
export const AUTH_CROSSLINK_CLASS =
  'font-semibold text-brand underline underline-offset-4 hover:text-brand-hover';

/** The submit button of an auth form — full width, ochre, pill. */
export const AUTH_SUBMIT_CLASS = 'h-10 w-full rounded-pill text-sm font-semibold';

/** The label above an auth field. Small, muted, uppercase-free. */
export const AUTH_LABEL_CLASS = 'text-xs font-medium text-ink-muted';

/** The field itself: theme C boxes an auth input rather than underlining it. */
export const AUTH_FIELD_CLASS = 'mt-1 h-10 rounded-row bg-surface-raised text-sm text-ink';
