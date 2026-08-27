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
 */

import type { FormEvent, ReactNode } from 'react';
import { appCopy } from '../copy/strings';

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
      className="flex min-h-screen items-center justify-center bg-surface px-6 py-12"
    >
      <div className="panel w-full max-w-sm p-8">
        <p className="text-[21px] leading-7 font-bold tracking-[-0.02em] text-brand">
          {appCopy.name}
        </p>
        <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          {children}
        </form>

        <p className="mt-6 border-t border-rule pt-5 text-center text-sm text-ink-muted">
          {footer}
        </p>
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
