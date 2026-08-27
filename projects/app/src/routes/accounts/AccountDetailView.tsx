import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AmountCell } from '../../components/AmountCell';
import { UndoBar } from '../../components/UndoBar';
import { accountKindCopy, accountsCopy, rowCopy } from '../../copy/strings';
import type { Transaction } from '../../data/types';
import { accountBalanceMinor } from '../../lib/account-balance';
import { formatAmount } from '../../lib/money';
import { useAppData } from '../../state/useAppData';
import { byLedgerOrder, byName } from '../ledger/ordering';
import { TransactionList } from '../ledger/TransactionList';

/**
 * One account: its derived balance, and its own ledger.
 *
 * ## It reuses the ledger's list, deliberately
 *
 * `TransactionList` is the ledger's rows, its day groups, its day subtotals, its
 * inline editor and its keyboard model. Re-implementing a second, simpler list
 * here would be a second place for a row to be rendered — and design-system.md
 * §3 exists because the same amount rendered by two components is two chances
 * for it to pick up a different sign colour. So this screen filters and the list
 * renders, and a transfer leg looks exactly the same here as it does on the
 * ledger.
 *
 * ## What it does NOT carry
 *
 * No filters (the account IS the filter, and the ledger's own account filter
 * still answers the more general question) and no quick entry: entry belongs on
 * the ledger, where the caret already sits on mount, and a second always-mounted
 * entry bar would be a second thing competing for the initial focus.
 *
 * The balance in the header is derived from `opening_balance_minor` plus these
 * rows, on every render. Nothing is stored, so the header and the list below it
 * cannot disagree.
 */

export function AccountDetailView() {
  const { accountId } = useParams();
  const { transactions, accounts, categories, updateTransaction, removeTransaction, restoreTransactions } =
    useAppData();

  const [removed, setRemoved] = useState<readonly Transaction[] | null>(null);

  const account = accounts.find((candidate) => candidate.id === accountId) ?? null;

  const rows = useMemo(
    () =>
      account === null
        ? []
        : transactions.filter((txn) => txn.account_id === account.id).sort(byLedgerOrder),
    [account, transactions],
  );

  const sortedAccounts = useMemo(() => [...accounts].sort(byName), [accounts]);
  const sortedCategories = useMemo(() => [...categories].sort(byName), [categories]);

  const saveEdit = useCallback(
    (id: string, input: Omit<Transaction, 'id'>): void => {
      updateTransaction(id, input);
    },
    [updateTransaction],
  );

  const deleteRow = useCallback(
    (transaction: Transaction): void => {
      const gone = removeTransaction(transaction.id);
      if (gone.length === 0) return;
      setRemoved(gone);
    },
    [removeTransaction],
  );

  // An unknown id is a TERMINAL state and it says `ready` — a wait that only
  // accepts the populated screen would hang here forever (design-system.md §3.6).
  if (account === null) {
    return (
      <section data-view="account-detail" data-status="ready" data-account-id={accountId ?? ''}>
        <BackLink />
        <div className="panel mt-5 px-6 py-16 text-center" data-account-not-found="">
          <p className="font-medium text-ink">{accountsCopy.detailNotFound}</p>
        </div>
      </section>
    );
  }

  const balance = accountBalanceMinor(account, transactions);

  return (
    <section
      aria-labelledby="account-detail-title"
      data-view="account-detail"
      data-status="ready"
      data-account-id={account.id}
      data-balance-minor={balance}
      data-opening-balance-minor={account.opening_balance_minor}
      data-result-count={rows.length}
      data-archived={account.archived ? 'true' : 'false'}
    >
      <BackLink />

      <div className="panel mt-3 px-5 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1
              id="account-detail-title"
              className="text-xl leading-[26px] font-bold tracking-[-0.02em] text-ink"
            >
              {account.name}
            </h1>
            <p className="mt-1 text-[13px] text-ink-muted">
              {accountKindCopy[account.kind]} · {accountsCopy.openingLabel}{' '}
              {formatAmount(account.opening_balance_minor)} ·{' '}
              {accountsCopy.txnCount.replace('{count}', String(rows.length))}
              {account.archived ? ` · ${accountsCopy.archivedTitle}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="eyebrow">{accountsCopy.balanceLabel}</p>
            <AmountCell
              amountMinor={balance}
              className="text-[22px] leading-7 font-bold tracking-[-0.02em]"
            />
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          data-account-ledger-empty=""
          className="mt-3.5 rounded-panel border border-dashed border-border-subtle bg-surface-raised px-6 py-16 text-center"
        >
          <p className="font-medium text-ink">{accountsCopy.detailEmptyTitle}</p>
          <p className="mt-2 text-sm text-ink-muted">{accountsCopy.detailEmptyBody}</p>
        </div>
      ) : (
        <div className="mt-3.5">
          <TransactionList
            transactions={rows}
            accounts={sortedAccounts}
            categories={sortedCategories}
            onSave={saveEdit}
            onDelete={deleteRow}
          />
        </div>
      )}

      {removed !== null && removed.length > 0 && (
        <UndoBar
          kind="deleted"
          message={deletedMessage(removed)}
          actionLabel={rowCopy.undo}
          onAction={() => {
            restoreTransactions(removed);
            setRemoved(null);
          }}
          dismissLabel={rowCopy.dismiss}
          onDismiss={() => setRemoved(null)}
        />
      )}
    </section>
  );
}

/** Same message rule as the ledger: a transfer reads as the pair it was. */
function deletedMessage(gone: readonly Transaction[]): string {
  const anchor = gone.find((txn) => txn.amount_minor < 0) ?? gone[0];
  if (anchor === undefined) return '';
  const template = gone.length > 1 ? rowCopy.deletedTransfer : rowCopy.deleted;
  return template
    .replace('{description}', anchor.description)
    .replace('{amount}', formatAmount(anchor.amount_minor));
}

function BackLink() {
  return (
    <Link
      to="/accounts"
      data-action="back-to-accounts"
      className="inline-flex items-center gap-1.5 rounded-pill px-1 py-1 text-[13px] font-medium text-ink-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <ArrowLeft aria-hidden="true" className="size-3.5" />
      {accountsCopy.detailBack}
    </Link>
  );
}
