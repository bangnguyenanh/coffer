/**
 * Mock request handlers — the DRAFT of the phase-2 API contract.
 *
 * Hub ticket 0003: the client is built first against a mock network layer, and
 * these handlers become the draft contract, written by the consumer that has to
 * live with it. Read them as a proposal, not as a fixture harness:
 *
 *   GET  /api/accounts
 *   GET  /api/categories
 *   GET  /api/transactions?from&to&account_id&category_id&q&limit&offset
 *   POST /api/transactions
 *
 * Contract rules honoured here (hub CLAUDE.md, ADR 0003, ticket 0001):
 *   - `amount_minor` is a signed integer JSON number, VND exponent 0.
 *   - Sign is direction; neither account nor category implies it.
 *   - `occurred_on` is a calendar date `YYYY-MM-DD`, never a timestamp.
 *   - No per-row currency field. No `balance` field on an account.
 *   - Filtering happens HERE, in the request, not in a client-side array pass.
 */

import { HttpResponse, http, type DefaultBodyType, type PathParams } from 'msw';
import type { Account, ApiErrorBody, Category, Collection, Transaction, TransactionQuery } from '../api/types';
import { createTransaction, listAccounts, listCategories, listTransactions } from './store';

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

function badRequest(code: string, message: string): HttpResponse<ApiErrorBody> {
  return HttpResponse.json<ApiErrorBody>({ error: { code, message } }, { status: 400 });
}

/** Read an optional param; an empty string means "not filtering", not "match empty". */
function optional(params: URLSearchParams, name: string): string | undefined {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return undefined;
  return raw.trim();
}

function optionalInteger(params: URLSearchParams, name: string): number | undefined | null {
  const raw = optional(params, name);
  if (raw === undefined) return undefined;
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

/** Request/response body types the resolvers are declared against. */
type NewTransaction = Partial<Omit<Transaction, 'id'>>;
type TransactionsResponse = Collection<Transaction> | ApiErrorBody;
type CreatedTransaction = { data: Transaction } | ApiErrorBody;

export const handlers = [
  http.get<PathParams, DefaultBodyType, Collection<Account>>('/api/accounts', () => {
    const rows = listAccounts();
    return HttpResponse.json({
      data: rows,
      meta: { total: rows.length, limit: rows.length, offset: 0 },
    });
  }),

  http.get<PathParams, DefaultBodyType, Collection<Category>>('/api/categories', () => {
    const rows = listCategories();
    return HttpResponse.json({
      data: rows,
      meta: { total: rows.length, limit: rows.length, offset: 0 },
    });
  }),

  http.get<PathParams, DefaultBodyType, TransactionsResponse>('/api/transactions', ({ request }) => {
    const params = new URL(request.url).searchParams;

    for (const name of ['from', 'to'] as const) {
      const value = optional(params, name);
      if (value !== undefined && !CALENDAR_DATE.test(value)) {
        return badRequest('invalid_date', `\`${name}\` must be a calendar date in YYYY-MM-DD form.`);
      }
    }

    const limit = optionalInteger(params, 'limit');
    const offset = optionalInteger(params, 'offset');
    if (limit === null || offset === null) {
      return badRequest('invalid_pagination', '`limit` and `offset` must be non-negative integers.');
    }

    // Built by spread because `exactOptionalPropertyTypes` distinguishes an
    // absent filter from one explicitly set to `undefined`. Absent means "do
    // not narrow on this field".
    const from = optional(params, 'from');
    const to = optional(params, 'to');
    const accountId = optional(params, 'account_id');
    const categoryId = optional(params, 'category_id');
    const q = optional(params, 'q');

    const query: TransactionQuery = {
      ...(from !== undefined && { from }),
      ...(to !== undefined && { to }),
      ...(accountId !== undefined && { account_id: accountId }),
      ...(categoryId !== undefined && { category_id: categoryId }),
      ...(q !== undefined && { q }),
      ...(limit !== undefined && { limit }),
      ...(offset !== undefined && { offset }),
    };

    const { rows, total } = listTransactions(query);
    return HttpResponse.json({
      data: rows,
      meta: { total, limit: query.limit ?? total, offset: query.offset ?? 0 },
    });
  }),

  http.post<PathParams, NewTransaction, CreatedTransaction>('/api/transactions', async ({ request }) => {
    const body = (await request.json()) as NewTransaction | null;

    if (body === null || typeof body !== 'object') {
      return badRequest('invalid_body', 'Request body must be a JSON object.');
    }
    if (typeof body.occurred_on !== 'string' || !CALENDAR_DATE.test(body.occurred_on)) {
      return badRequest('invalid_date', '`occurred_on` must be a calendar date in YYYY-MM-DD form.');
    }
    if (typeof body.amount_minor !== 'number' || !Number.isSafeInteger(body.amount_minor)) {
      return badRequest('invalid_amount', '`amount_minor` must be a signed integer in minor units.');
    }
    if (typeof body.description !== 'string' || body.description.trim() === '') {
      return badRequest('invalid_description', '`description` is required.');
    }
    if (typeof body.account_id !== 'string') {
      return badRequest('invalid_account', '`account_id` is required.');
    }
    if (!listAccounts().some((account) => account.id === body.account_id)) {
      return badRequest('unknown_account', `No account with id \`${body.account_id}\`.`);
    }
    const categoryId = body.category_id ?? null;
    if (categoryId !== null && !listCategories().some((category) => category.id === categoryId)) {
      return badRequest('unknown_category', `No category with id \`${categoryId}\`.`);
    }

    const created = createTransaction({
      occurred_on: body.occurred_on,
      amount_minor: body.amount_minor,
      description: body.description.trim(),
      account_id: body.account_id,
      category_id: categoryId,
    });

    return HttpResponse.json({ data: created }, { status: 201 });
  }),
];
