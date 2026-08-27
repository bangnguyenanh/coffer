import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { amountErrorCopy, transferCopy, transferErrorCopy } from '../../copy/strings';
import type { Account } from '../../data/types';
import { todayCalendarDate } from '../../lib/calendar-date';
import { CURRENCY_SYMBOL, formatAmount } from '../../lib/money';
import { useAppData } from '../../state/useAppData';
import type { TransferPair } from '../../state/AppDataContext';
import {
  transferDraftAmountMinor,
  transferDraftToInput,
  type TransferDraft,
  type TransferField,
} from './transfer-entry';

/**
 * Transfer entry — the bar on the accounts screen.
 *
 * ## Why it is HERE and not on the ledger
 *
 * Two reasons, and the second one is the harder constraint.
 *
 * A transfer is a question about accounts: *this money is now over there*. The
 * two balances it moves are on this screen, so the effect of a transfer is
 * visible in the same glance as the action — no navigation, and nothing to take
 * on trust.
 *
 * And the ledger's quick-entry row is measured. Its path is **11 keystrokes**
 * and the DOM order of the row IS the tab order (design-system.md §4). A
 * source/destination mode toggle bolted onto that row adds a tab stop to the
 * path the Owner walks dozens of times a day, to serve the thing they do a few
 * times a week. That is a regression, and the design system says a regression in
 * entry speed needs the Owner rather than a design opinion.
 *
 * ## Keyboard model
 *
 * `T` from anywhere on this screen puts the caret in the amount box — the same
 * affordance quick entry's `N` provides, and nothing is hidden behind it. The
 * DOM order is the tab order again: **amount → from → to → description → date →
 * transfer**, and the description is optional (it defaults to
 * `Chuyển tiền: {from} → {to}`) precisely so the fast path never has to type it.
 *
 * ## What it renders as evidence
 *
 * `data-amount-minor` is the signed magnitude that WOULD be stored, live, so a
 * 100× typo is visible before it is saved rather than in a balance afterwards.
 * `data-from` / `data-to` say which accounts are about to move, and
 * `data-saved-transfer-id` names the transfer that was created — which is the
 * id both ledger rows then carry.
 */

interface TransferEntryProps {
  /** ACTIVE accounts only — an archived account is not a place to put money. */
  readonly accounts: readonly Account[];
  readonly accountNames: ReadonlyMap<string, string>;
  readonly onTransferred: (pair: TransferPair) => void;
}

const CHIP_CLASS =
  'appearance-none rounded-pill bg-inset px-3.5 py-1.5 text-[13px] font-medium text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function TransferEntry({ accounts, accountNames, onTransferred }: TransferEntryProps) {
  const { addTransfer } = useAppData();

  const amountRef = useRef<HTMLInputElement>(null);
  const fromRef = useRef<HTMLSelectElement>(null);
  const toRef = useRef<HTMLSelectElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<TransferDraft>(() => ({
    amount: '',
    // Two different defaults, so the form is never pre-loaded with the one
    // combination it refuses to save.
    from_account_id: accounts[0]?.id ?? '',
    to_account_id: accounts[1]?.id ?? '',
    description: '',
    occurred_on: todayCalendarDate(),
  }));
  const [submitted, setSubmitted] = useState(false);

  const enoughAccounts = accounts.length >= 2;

  const result = transferDraftToInput(draft, accountNames);
  const errors = submitted && !result.ok ? result.errors : [];
  const errorFor = (field: TransferField): string | null => {
    const hit = errors.find((error) => error.field === field);
    if (hit === undefined) return null;
    if (hit.field === 'amount') {
      return hit.reason === 'AMOUNT_ZERO'
        ? transferErrorCopy.AMOUNT_ZERO
        : amountErrorCopy[hit.reason];
    }
    return transferErrorCopy[hit.reason];
  };

  const preview = transferDraftAmountMinor(draft);

  const focusAmount = useCallback((): void => {
    amountRef.current?.focus();
    amountRef.current?.select();
  }, []);

  /**
   * `T` returns the caret to the amount box, from anywhere that is not itself a
   * text field. Same guard as quick entry's `N`: typing `t` in a description
   * must type a `t`.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 't' && event.key !== 'T') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement)
      ) {
        return;
      }
      event.preventDefault();
      focusAmount();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [focusAmount]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const attempt = transferDraftToInput(draft, accountNames);
    if (!attempt.ok) {
      setSubmitted(true);
      const refByField: Record<TransferField, { readonly current: HTMLElement | null }> = {
        amount: amountRef,
        from_account_id: fromRef,
        to_account_id: toRef,
        occurred_on: dateRef,
      };
      const first = attempt.errors[0];
      if (first !== undefined) refByField[first.field].current?.focus();
      return;
    }

    const pair = addTransfer(attempt.input);
    onTransferred(pair);
    // Keep the accounts and the date: transfers come in runs, and re-choosing
    // the same two accounts is the cost this default removes.
    setDraft((current) => ({ ...current, amount: '', description: '' }));
    setSubmitted(false);
    focusAmount();
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setDraft((current) => ({ ...current, amount: '', description: '' }));
    setSubmitted(false);
    focusAmount();
  };

  const amountError = errorFor('amount');
  const accountError = errorFor('from_account_id') ?? errorFor('to_account_id');
  const dateError = errorFor('occurred_on');
  const firstError = amountError ?? accountError ?? dateError;

  return (
    <form
      onSubmit={submit}
      onKeyDown={onKeyDown}
      noValidate
      className="panel mt-5 px-5 py-4.5"
      data-transfer-entry=""
      data-transfer-ready={enoughAccounts ? 'true' : 'false'}
      data-amount-minor={preview.ok ? String(preview.amountMinor) : ''}
      data-amount-preview={preview.ok ? formatAmount(preview.amountMinor) : ''}
      data-from={draft.from_account_id}
      data-to={draft.to_account_id}
      data-error-fields={errors.map((error) => error.field).join(' ')}
      aria-labelledby="transfer-legend"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="transfer-legend" className="eyebrow">
          {transferCopy.legend}
        </h2>
        <p className="text-xs text-ink-faint">{transferCopy.hint}</p>
      </div>

      {!enoughAccounts ? (
        <p className="mt-2 text-sm text-ink-muted" data-transfer-blocked="">
          {transferCopy.needTwoAccounts}
        </p>
      ) : (
        <>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <div className="flex min-w-[9.5rem] flex-1 items-baseline gap-2 border-b-2 border-field-line px-1 pt-0.5 pb-1.5 focus-within:border-brand">
              <Label htmlFor="transfer-amount" className="sr-only">
                {transferCopy.amount}
              </Label>
              <input
                id="transfer-amount"
                ref={amountRef}
                name="amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={transferCopy.amountPlaceholder}
                aria-invalid={amountError !== null}
                aria-describedby="transfer-status"
                className="w-full border-0 bg-transparent text-[24px] leading-[30px] font-semibold tracking-[-0.02em] tabular-nums text-ink outline-none placeholder:text-ink-faint/60"
                value={draft.amount}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, amount: event.target.value }))
                }
              />
              <span aria-hidden="true" className="text-[17px] text-ink-faint">
                {CURRENCY_SYMBOL}
              </span>
            </div>

            <div className="shrink-0">
              <Label htmlFor="transfer-from" className="sr-only">
                {transferCopy.from}
              </Label>
              <select
                id="transfer-from"
                ref={fromRef}
                name="from_account_id"
                aria-invalid={errorFor('from_account_id') !== null}
                className={CHIP_CLASS}
                value={draft.from_account_id}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, from_account_id: event.target.value }))
                }
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-ink-faint" />

            <div className="shrink-0">
              <Label htmlFor="transfer-to" className="sr-only">
                {transferCopy.to}
              </Label>
              <select
                id="transfer-to"
                ref={toRef}
                name="to_account_id"
                aria-invalid={errorFor('to_account_id') !== null}
                className={CHIP_CLASS}
                value={draft.to_account_id}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, to_account_id: event.target.value }))
                }
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex min-w-[8rem] flex-1 flex-col">
              <Label htmlFor="transfer-description" className="sr-only">
                {transferCopy.description}
              </Label>
              <input
                id="transfer-description"
                name="description"
                type="text"
                autoComplete="off"
                // The placeholder IS the value that will be stored if nothing is
                // typed, so the optional field says what skipping it means.
                placeholder={transferCopy.defaultDescription
                  .replace('{from}', accountNames.get(draft.from_account_id) ?? '')
                  .replace('{to}', accountNames.get(draft.to_account_id) ?? '')}
                className="w-full border-0 border-b-2 border-field-line-soft bg-transparent px-1 py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint/60 focus-visible:border-b-brand"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>

            <div className="shrink-0">
              <Label htmlFor="transfer-date" className="sr-only">
                {transferCopy.date}
              </Label>
              <input
                id="transfer-date"
                ref={dateRef}
                name="occurred_on"
                type="date"
                aria-invalid={dateError !== null}
                className="rounded-pill bg-inset px-3 py-1.5 text-[13px] tabular-nums text-ink-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                value={draft.occurred_on}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, occurred_on: event.target.value }))
                }
              />
            </div>

            <Button
              type="submit"
              data-action="save-transfer"
              className="h-10 shrink-0 rounded-pill px-5 text-sm font-semibold"
            >
              {transferCopy.submit}
            </Button>
          </div>

          <p
            id="transfer-status"
            role={firstError === null ? undefined : 'alert'}
            className={`mt-2 text-xs ${firstError === null ? 'text-ink-faint' : 'text-outflow'}`}
          >
            {firstError ?? transferCopy.note}
          </p>
        </>
      )}
    </form>
  );
}
