import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { LedgerView } from './routes/ledger/LedgerView';

/** Routes. The ledger is the landing route. */
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LedgerView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
