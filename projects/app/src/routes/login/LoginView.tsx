/**
 * Login — permanently reachable, the other half of the pair.
 *
 * It no longer knows or asks whether any account exists (Owner directive
 * 2026-08-25): it does not redirect to sign up on an empty session, it just
 * rejects the credential like any other wrong one. That is what an ordinary
 * login does, and it is also the safer behaviour — a screen that redirects when
 * no account matches is telling an anonymous visitor something about who is
 * registered.
 *
 * The failure path is the part that matters here: a wrong credential comes back
 * as `invalid_credentials` and is RENDERED on the form. A login screen that
 * silently does nothing on a bad password is the failure this is written
 * against.
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
import { authLinkCopy, loginCopy } from '../../copy/strings';

export function LoginView() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = signIn({ email, password });
    setErrorCode(result.ok ? null : result.code);
  };

  return (
    <AuthScreen
      view="login"
      title={loginCopy.title}
      subtitle={loginCopy.subtitle}
      onSubmit={onSubmit}
      footer={
        <>
          {authLinkCopy.toSignup.prompt}{' '}
          <Link to="/signup" data-link="to-signup" className={AUTH_CROSSLINK_CLASS}>
            {authLinkCopy.toSignup.action}
          </Link>
        </>
      }
    >
      <AuthError code={errorCode} />

      <div>
        <label className={AUTH_LABEL_CLASS} htmlFor="login-email">{loginCopy.email}</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          placeholder={loginCopy.emailPlaceholder}
          className={AUTH_FIELD_CLASS}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      <div>
        <label className={AUTH_LABEL_CLASS} htmlFor="login-password">{loginCopy.password}</label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={AUTH_FIELD_CLASS}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-md bg-brand px-3 py-2 text-sm font-medium text-surface-raised"
      >
        {loginCopy.submit}
      </button>
    </AuthScreen>
  );
}
