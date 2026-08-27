import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AmountCell } from '../../components/AmountCell';
import { UndoBar } from '../../components/UndoBar';
import { Button } from '@/components/ui/button';
import { accountErrorCopy, accountKindCopy, accountsCopy, amountErrorCopy, transferCopy } from '../../copy/strings';
import type { Account } from '../../data/types';
import { accountBalancesById, accountTransactionCount } from '../../lib/account-balance';
import { formatAmount } from '../../lib/money';
import { isTransfer, spendingRowCount, spendingTotalMinor } from '../../lib/transfers';
import type { TransferPair } from '../../state/AppDataContext';
import { useAppData } from '../../state/useAppData';
import { byName } from '../ledger/ordering';
import { AccountForm } from './AccountForm';
import { TransferEntry } from './TransferEntry';
import {
  accountDraftFrom,
  accountDraftToAccount,
  emptyAccountDraft,
  type AccountDraft,
  type AccountField,
} from './account-form';

/**
 * The accounts screen — hub ticket 0004 phases 1 and 2.
 *
 * ## Every balance on this page is DERIVED
 *
 * `opening_balance_minor` plus that account's transactions, recomputed on every
 * render (`src/lib/account-balance.ts`). There is no stored balance anywhere in
 * this product and adding one is an explicit non-goal of hub ticket 0001. The
 * reason is not purity: a cached balance is a second copy of a number the ledger
 * already answers, and on the day the two disagree there is no way for a reader
 * to tell which one is lying. The subtitle says so on the screen, because a
 * number nobody can explain is a number nobody trusts.
 *
 * ## Archive, never delete
 *
 * An account holds history. Deleting one either orphans its transactions or
 * takes them with it, and both are unrecoverable in a product whose whole job is
 * to remember. So there is no delete on this surface: archiving takes the
 * account out of the pickers — quick entry and the transfer form show active
 * accounts only — and leaves the balance, the rows and the detail page exactly
 * where they were. It is reversible from the undo bar and from the archived
 * list, which is why it needs no confirmation dialog (design-system.md §3.9).
 *
 * ## The exclusion proof lives on this screen
 *
 * Phase 2's whole claim is *a transfer moves two balances and changes no
 * spending total*. Both halves of that are rendered here, a few centimetres
 * apart: the balances above, and `data-spending-total-minor` below the transfer
 * bar. That total is over ALL transactions and is deliberately not a month
 * figure — the month summary and theme C's month band are phase 4's work, not
 * this screen's.
 */

type AccountsNotice =
  | { readonly kind: 'archived'; readonly account: Account }
  | { readonly kind: 'unarchived'; readonly account: Account }
  | { readonly kind: 'transferred'; readonly pair: TransferPair };

export function AccountsView() {
  const {
    transactions,
    accounts,
    addAccount,
    updateAccount,
    setAccountArchived,
    removeTransaction,
  } = useAppData();

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AccountDraft>(emptyAccountDraft);
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<AccountsNotice | null>(null);

  const ordered = useMemo(() => [...accounts].sort(byName), [accounts]);
  const active = useMemo(() => ordered.filter((account) => !account.archived), [ordered]);
  const archived = useMemo(() => ordered.filter((account) => account.archived), [ordered]);

  const balances = useMemo(
    () => accountBalancesById(ordered, transactions),
    [ordered, transactions],
  );
  const accountNames = useMemo(
    () => new Map(ordered.map((account) => [account.id, account.name])),
    [ordered],
  );

  // Integer addition in minor units, over the accounts that are still in use.
  // Archived accounts are excluded from the headline the same way they are
  // excluded from the pickers: the question is "how much do I have to work
  // with", and money in a closed wallet is not it. Their own subtotal is
  // rendered beside the archived list.
  const activeTotal = active.reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0);
  const archivedTotal = archived.reduce(
    (sum, account) => sum + (balances.get(account.id) ?? 0),
    0,
  );

  const spendingTotal = spendingTotalMinor(transactions);
  const spendingCount = spendingRowCount(transactions);
  const transferLegCount = transactions.filter(isTransfer).length;

  const editingAccount = editingId === null ? null : (ordered.find((a) => a.id === editingId) ?? null);
  const formResult = accountDraftToAccount(draft, editingAccount?.archived ?? false);
  const formErrors = submitted && !formResult.ok ? formResult.errors : [];
  const errorFor = (field: AccountField): string | null => {
    const hit = formErrors.find((error) => error.field === field);
    if (hit === undefined) return null;
    return hit.field === 'opening' ? amountErrorCopy[hit.reason] : accountErrorCopy[hit.reason];
  };

  const closeForm = useCallback((): void => {
    setCreating(false);
    setEditingId(null);
    setDraft(emptyAccountDraft);
    setSubmitted(false);
  }, []);

  const startCreate = useCallback((): void => {
    setEditingId(null);
    setDraft(emptyAccountDraft);
    setSubmitted(false);
    setCreating(true);
  }, []);

  const startEdit = useCallback((account: Account): void => {
    setCreating(false);
    setDraft(accountDraftFrom(account));
    setSubmitted(false);
    setEditingId(account.id);
  }, []);

  const submitForm = useCallback((): void => {
    const attempt = accountDraftToAccount(draft, editingAccount?.archived ?? false);
    if (!attempt.ok) {
      setSubmitted(true);
      return;
    }
    if (editingId === null) addAccount(attempt.account);
    else updateAccount(editingId, attempt.account);
    closeForm();
  }, [addAccount, closeForm, draft, editingAccount, editingId, updateAccount]);

  const archive = useCallback(
    (account: Account, next: boolean): void => {
      const updated = setAccountArchived(account.id, next);
      if (updated === null) return;
      setNotice({ kind: next ? 'archived' : 'unarchived', account: updated });
    },
    [setAccountArchived],
  );

  const undoNotice = useCallback((): void => {
    if (notice === null) return;
    if (notice.kind === 'transferred') {
      // Removing either leg removes the transfer — the pair invariant lives in
      // the shared state, not in this caller (see `removeTransaction`).
      removeTransaction(notice.pair.from.id);
    } else {
      setAccountArchived(notice.account.id, notice.kind !== 'archived');
    }
    setNotice(null);
  }, [notice, removeTransaction, setAccountArchived]);

  const noticeMessage =
    notice === null
      ? ''
      : notice.kind === 'transferred'
        ? transferCopy.saved
            .replace('{amount}', formatAmount(Math.abs(notice.pair.from.amount_minor)))
            .replace('{from}', accountNames.get(notice.pair.from.account_id) ?? '')
            .replace('{to}', accountNames.get(notice.pair.to.account_id) ?? '')
        : (notice.kind === 'archived' ? accountsCopy.archived : accountsCopy.unarchived).replace(
            '{name}',
            notice.account.name,
          );

  return (
    <section
      aria-labelledby="accounts-title"
      data-view="accounts"
      data-status="ready"
      data-active-account-count={active.length}
      data-archived-account-count={archived.length}
      data-total-balance-minor={activeTotal}
      data-transfer-leg-count={transferLegCount}
      data-notice={notice?.kind ?? ''}
    >
      <div className="flex items-baseline gap-3.5">
        <h1
          id="accounts-title"
          className="text-xl leading-[26px] font-bold tracking-[-0.02em] text-ink"
        >
          {accountsCopy.title}
        </h1>
        <p className="text-[13px] tabular-nums text-ink-muted">
          {accountsCopy.count.replace('{count}', String(active.length))}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-muted">{accountsCopy.subtitle}</p>

      <div className="panel mt-5">
        <div className="flex items-baseline justify-between border-b border-rule px-5 py-3.5">
          <h2 className="eyebrow">{accountsCopy.totalLabel}</h2>
          <AmountCell
            amountMinor={activeTotal}
            className="text-[22px] leading-7 font-bold tracking-[-0.02em]"
          />
        </div>

        {active.length === 0 ? (
          <div className="px-5 py-12 text-center" data-accounts-empty="">
            <p className="font-medium text-ink">{accountsCopy.emptyTitle}</p>
            <p className="mt-2 text-sm text-ink-muted">{accountsCopy.emptyBody}</p>
          </div>
        ) : (
          <ul>
            {active.map((account) =>
              editingId === account.id ? (
                <li key={account.id} data-account-id={account.id} className="border-b border-rule last:border-b-0">
                  <AccountForm
                    idPrefix={`account-${account.id}`}
                    draft={draft}
                    onDraftChange={setDraft}
                    errorFor={errorFor}
                    onSubmit={submitForm}
                    onCancel={closeForm}
                    submitLabel={accountsCopy.save}
                    legend={accountsCopy.editLegend}
                    errorFields={formErrors.map((error) => error.field).join(' ')}
                  />
                </li>
              ) : (
                <AccountRow
                  key={account.id}
                  account={account}
                  balanceMinor={balances.get(account.id) ?? 0}
                  transactionCount={accountTransactionCount(account, transactions)}
                  onEdit={startEdit}
                  onArchive={archive}
                />
              ),
            )}
          </ul>
        )}

        {creating ? (
          <div className="border-t border-rule">
            <AccountForm
              idPrefix="account-new"
              draft={draft}
              onDraftChange={setDraft}
              errorFor={errorFor}
              onSubmit={submitForm}
              onCancel={closeForm}
              submitLabel={accountsCopy.save}
              legend={accountsCopy.addLegend}
              errorFields={formErrors.map((error) => error.field).join(' ')}
            />
          </div>
        ) : (
          <div className="border-t border-rule px-4 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-action="add-account"
              onClick={startCreate}
              className="rounded-pill text-[13px] font-medium text-brand"
            >
              <Plus aria-hidden="true" />
              {accountsCopy.add}
            </Button>
          </div>
        )}
      </div>

      <TransferEntry
        accounts={active}
        accountNames={accountNames}
        onTransferred={(pair) => setNotice({ kind: 'transferred', pair })}
      />

      {/*
        The number phase 2 exists to hold still. It is over ALL transactions,
        not a month — the month band belongs to phase 4 — and it is the ONE
        element carrying `data-spending-total-minor` (design-system.md §3.10).
      */}
      <p
        className="mt-2.5 flex items-baseline gap-2 px-1 text-xs text-ink-muted"
        data-spending-total-minor={spendingTotal}
        data-spending-count={spendingCount}
      >
        <span>{accountsCopy.spendingLabel.replace('{count}', String(spendingCount))}</span>
        <AmountCell amountMinor={spendingTotal} className="text-xs font-semibold" />
      </p>

      {archived.length > 0 && (
        <div className="panel mt-6" data-archived-accounts="">
          <div className="flex items-baseline justify-between border-b border-rule px-5 py-3.5">
            <h2 className="eyebrow">{accountsCopy.archivedTitle}</h2>
            <AmountCell amountMinor={archivedTotal} className="text-sm font-semibold" />
          </div>
          <p className="px-5 pt-2.5 text-xs text-ink-faint">{accountsCopy.archivedNote}</p>
          <ul className="pt-1">
            {archived.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                balanceMinor={balances.get(account.id) ?? 0}
                transactionCount={accountTransactionCount(account, transactions)}
                onEdit={startEdit}
                onArchive={archive}
              />
            ))}
          </ul>
        </div>
      )}

      {notice !== null && (
        <UndoBar
          kind={notice.kind}
          message={noticeMessage}
          actionLabel={accountsCopy.undo}
          onAction={undoNotice}
          dismissLabel={accountsCopy.dismiss}
          onDismiss={() => setNotice(null)}
          // Informational for a transfer — nothing was lost, so the caret stays
          // in the form where the next transfer is already being typed.
          autoFocusAction={notice.kind !== 'transferred'}
        />
      )}
    </section>
  );
}

/**
 * One account: what it holds, how it got there, and the two things that can be
 * done to it.
 *
 * The name is a `Link` and the actions are buttons BESIDE it rather than inside
 * it — nesting a button in a link is invalid HTML and gives the keyboard two
 * overlapping targets for one row.
 */
function AccountRow({
  account,
  balanceMinor,
  transactionCount,
  onEdit,
  onArchive,
}: {
  readonly account: Account;
  readonly balanceMinor: number;
  readonly transactionCount: number;
  readonly onEdit: (account: Account) => void;
  readonly onArchive: (account: Account, next: boolean) => void;
}) {
  return (
    <li
      data-account-id={account.id}
      data-balance-minor={balanceMinor}
      data-archived={account.archived ? 'true' : 'false'}
      data-account-txn-count={transactionCount}
      className="grid grid-cols-[1fr_180px_auto] items-center gap-4 border-b border-rule px-4 py-2.5 last:border-b-0"
    >
      <Link
        to={`/accounts/${account.id}`}
        data-action="open-account"
        aria-label={accountsCopy.openLabel.replace('{name}', account.name)}
        className="rounded-row px-1 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="text-[15px] font-medium text-ink">{account.name}</span>
        <span className="mt-0.5 block text-[13px] text-ink-muted">
          {accountKindCopy[account.kind]} ·{' '}
          {accountsCopy.txnCount.replace('{count}', String(transactionCount))} ·{' '}
          {accountsCopy.openingLabel} {formatAmount(account.opening_balance_minor)}
        </span>
      </Link>

      <AmountCell amountMinor={balanceMinor} className="text-right text-base font-semibold" />

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-action="edit-account"
          aria-label={accountsCopy.editLabel.replace('{name}', account.name)}
          onClick={() => onEdit(account)}
          className="rounded-pill text-[13px] text-ink-muted"
        >
          {accountsCopy.edit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-action={account.archived ? 'unarchive-account' : 'archive-account'}
          aria-label={(account.archived
            ? accountsCopy.unarchiveLabel
            : accountsCopy.archiveLabel
          ).replace('{name}', account.name)}
          onClick={() => onArchive(account, !account.archived)}
          className="rounded-pill text-[13px] text-ink-muted"
        >
          {account.archived ? accountsCopy.unarchive : accountsCopy.archive}
        </Button>
      </div>
    </li>
  );
}
