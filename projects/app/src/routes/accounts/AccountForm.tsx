import { useRef, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { accountsCopy, accountKindCopy } from '../../copy/strings';
import { CURRENCY_SYMBOL } from '../../lib/money';
import { ACCOUNT_KINDS, type AccountDraft, type AccountField } from './account-form';

/**
 * One form, used for creating an account and for editing one in place.
 *
 * It is the same component for both because the rules are the same
 * (`account-form.ts`), and two forms over one rule set is how a rule ends up
 * enforced on create and forgotten on edit — the lesson `EntryFields` already
 * carries for the ledger.
 *
 * **There is no dialog and no modal**, on this screen or anywhere else on this
 * surface (design-system.md §3.9). Creating an account reveals a row; editing
 * one replaces the row it edits. Nothing is trapped and nothing is blocked
 * behind an overlay.
 *
 * Theme C: ruled-line inputs rather than boxes, a chip for the kind select, and
 * the `₫` adornment beside the opening balance — taken from the money module,
 * never typed here.
 */

interface AccountFormProps {
  readonly idPrefix: string;
  readonly draft: AccountDraft;
  readonly onDraftChange: (updater: (current: AccountDraft) => AccountDraft) => void;
  readonly errorFor: (field: AccountField) => string | null;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
  readonly submitLabel: string;
  readonly legend: string;
  readonly errorFields: string;
}

const LINE_CLASS =
  'w-full border-0 border-b-2 bg-transparent px-1 py-1.5 outline-none focus-visible:border-b-brand';
const CHIP_CLASS =
  'appearance-none rounded-pill bg-inset px-3.5 py-1.5 text-[13px] font-medium text-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

export function AccountForm({
  idPrefix,
  draft,
  onDraftChange,
  errorFor,
  onSubmit,
  onCancel,
  submitLabel,
  legend,
  errorFields,
}: AccountFormProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const id = (field: string): string => `${idPrefix}-${field}`;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    onSubmit();
  };

  /** Escape backs out — the same key that clears the quick-entry draft. */
  const onKeyDown = (event: ReactKeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onCancel();
  };

  const nameError = errorFor('name');
  const kindError = errorFor('kind');
  const openingError = errorFor('opening');

  return (
    <form
      onSubmit={submit}
      onKeyDown={onKeyDown}
      noValidate
      data-account-form=""
      data-error-fields={errorFields}
      aria-labelledby={id('legend')}
      className="px-4 py-3"
    >
      <h3 id={id('legend')} className="eyebrow">
        {legend}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        <div className="flex min-w-[12rem] flex-[1.4] flex-col">
          <Label htmlFor={id('name')} className="sr-only">
            {accountsCopy.name}
          </Label>
          <input
            id={id('name')}
            ref={nameRef}
            name="name"
            type="text"
            autoComplete="off"
            autoFocus
            placeholder={accountsCopy.namePlaceholder}
            aria-invalid={nameError !== null}
            className={`${LINE_CLASS} border-field-line text-base text-ink placeholder:text-ink-faint/60`}
            value={draft.name}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, name: event.target.value }))
            }
          />
        </div>

        <div className="shrink-0">
          <Label htmlFor={id('kind')} className="sr-only">
            {accountsCopy.kind}
          </Label>
          {/* Native `<select>`, like every other picker on this surface — a
              Radix listbox changes the keyboard model (design-system.md §2). */}
          <select
            id={id('kind')}
            name="kind"
            aria-invalid={kindError !== null}
            className={CHIP_CLASS}
            value={draft.kind}
            onChange={(event) =>
              onDraftChange((current) => ({
                ...current,
                kind: event.target.value as AccountDraft['kind'],
              }))
            }
          >
            {ACCOUNT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {accountKindCopy[kind]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-[9rem] flex-1 items-baseline gap-2 border-b-2 border-field-line px-1 pb-1.5 focus-within:border-brand">
          <Label htmlFor={id('opening')} className="sr-only">
            {accountsCopy.opening}
          </Label>
          <input
            id={id('opening')}
            name="opening_balance_minor"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={accountsCopy.opening}
            aria-invalid={openingError !== null}
            className="w-full border-0 bg-transparent text-base font-semibold tabular-nums text-ink outline-none placeholder:text-[13px] placeholder:font-normal placeholder:text-ink-faint/60"
            value={draft.opening}
            onChange={(event) =>
              onDraftChange((current) => ({ ...current, opening: event.target.value }))
            }
          />
          <span aria-hidden="true" className="text-[15px] text-ink-faint">
            {CURRENCY_SYMBOL}
          </span>
        </div>

        <Button
          type="submit"
          data-action="save-account"
          className="h-9 shrink-0 rounded-pill px-4 text-[13px] font-semibold"
        >
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          data-action="cancel-account"
          onClick={onCancel}
          className="h-9 shrink-0 rounded-pill px-3 text-[13px] text-ink-muted"
        >
          {accountsCopy.cancel}
        </Button>
      </div>

      {(nameError ?? kindError ?? openingError) !== null && (
        <p className="mt-2 text-xs text-outflow" role="alert" data-account-form-error="">
          {nameError ?? kindError ?? openingError}
        </p>
      )}
    </form>
  );
}
