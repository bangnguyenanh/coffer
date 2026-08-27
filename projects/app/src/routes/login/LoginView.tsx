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
 *
 * **Both fields open prefilled with the prototype fixture** (Owner directive
 * 2026-08-27, hub ticket 0003 phase 2c) — the account `AuthProvider` seeds, so
 * the two cannot drift: they read the same constant. The caret starts in the
 * email field, so the ledger is one Enter away with nothing typed.
 *
 * This is a PREFILL, not a bypass. The screen still renders, still submits, and
 * still rejects — clear a field, or edit the password, and you get the ordinary
 * failure path above. It also dies with the fixture in episode 2, and the two
 * `useState` initialisers are the whole of what has to be undone.
 */

import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthError } from '../../auth/AuthError';
import {
  AUTH_CROSSLINK_CLASS,
  AUTH_FIELD_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_SUBMIT_CLASS,
  AuthScreen,
} from '../../auth/AuthScreen';
import { PROTOTYPE_ACCOUNT } from '../../auth/prototype-account';
import { useAuth } from '../../auth/useAuth';
import { authLinkCopy, loginCopy } from '../../copy/strings';

export function LoginView() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(PROTOTYPE_ACCOUNT.email);
  const [password, setPassword] = useState(PROTOTYPE_ACCOUNT.password);
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
        <Label className={AUTH_LABEL_CLASS} htmlFor="login-email">{loginCopy.email}</Label>
        <Input
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
        <Label className={AUTH_LABEL_CLASS} htmlFor="login-password">{loginCopy.password}</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={AUTH_FIELD_CLASS}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <Button type="submit" className={AUTH_SUBMIT_CLASS}>
        {loginCopy.submit}
      </Button>
    </AuthScreen>
  );
}
