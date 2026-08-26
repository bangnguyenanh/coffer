/**
 * Read the app's data. Throws outside the provider rather than handing back an
 * empty ledger, which would look like a data bug somewhere else entirely.
 */

import { useContext } from 'react';
import { AppDataContext, type AppData } from './AppDataContext';

export function useAppData(): AppData {
  const data = useContext(AppDataContext);
  if (data === null) {
    throw new Error('useAppData must be used inside <AppDataProvider>');
  }
  return data;
}
