/**
 * Sign up — permanently reachable, the conventional half of the pair.
 *
 * This replaces `routes/setup/SetupView.tsx` (Owner directive 2026-08-25). The
 * form is nearly the same three fields; what changed is everything around it.
 * The old screen existed only while zero accounts existed and vanished
 * afterwards, and `AuthProvider` refused a second account outright. Now it is
 * always here, any number of accounts may be created, and a duplicate address
 * is an ordinary rendered form error rather than a state that cannot occur.
 *
 * Creating an account signs you in and lands on the ledger — no "now log in
 * with what you just made" round trip.
 */

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthError } from '../../auth/AuthError';
import {
  AUTH_CROSSLINK_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_LABEL_CLASS,
  AuthScreen,
} from '../../auth/AuthScreen';
import { useAuth } from '../../auth/useAuth';
import { authLinkCopy, signupCopy } from '../../copy/strings';

export function SignupView() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    // Checked before anything else: a mismatched confirmation is the form's own
    // problem and never becomes an account.
    if (password !== confirm) {
      setErrorCode('password_mismatch');
      return;
    }

    const result = signUp({ email, password });
    setErrorCode(result.ok ? null : result.code);
    // On success nothing is navigated here: the gate re-renders the moment the
    // status flips and the ledger takes over.
  };

  return (
    <AuthScreen
      view="signup"
      title={signupCopy.title}
      subtitle={signupCopy.subtitle}
      onSubmit={onSubmit}
      footer={
        <>
          {authLinkCopy.toLogin.prompt}{' '}
          <Link to="/login" data-link="to-login" className={AUTH_CROSSLINK_CLASS}>
            {authLinkCopy.toLogin.action}
          </Link>
        </>
      }
    >
      <AuthError code={errorCode} />

      <div>
        <label className={AUTH_LABEL_CLASS} htmlFor="signup-email">{signupCopy.email}</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          placeholder={signupCopy.emailPlaceholder}
          className={AUTH_FIELD_CLASS}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div>
        <label className={AUTH_LABEL_CLASS} htmlFor="signup-password">{signupCopy.password}</label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={AUTH_FIELD_CLASS}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="mt-1 text-xs text-ink-muted">{signupCopy.passwordHint}</p>
      </div>

      <div>
        <label className={AUTH_LABEL_CLASS} htmlFor="signup-confirm">{signupCopy.confirm}</label>
        <input
          id="signup-confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          className={AUTH_FIELD_CLASS}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-surface-raised"
      >
        {signupCopy.submit}
      </button>
    </AuthScreen>
  );
}
