/** Read the auth state. Throws if used outside the provider, rather than
 * silently handing back a logged-out shape that would look like a bug elsewhere. */

import { useContext } from 'react';
import { AuthContext, type AuthState } from './AuthContext';

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (state === null) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return state;
}
