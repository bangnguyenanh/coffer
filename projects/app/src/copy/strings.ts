/**
 * User-facing copy. Kept here so it can be found and changed in one place
 * rather than scattered through components (see documents/coding-conventions.md).
 *
 * Currency symbols never appear here — they come from src/lib/money.ts.
 */

import type { ParseAmountFailure } from '../lib/money';

export const appCopy = {
  name: 'Coffer',
  tagline: 'Sổ chi tiêu cá nhân',
  nav: {
    ledger: 'Sổ cái',
  },
} as const;

export const ledgerCopy = {
  title: 'Sổ cái',
  subtitle: 'Mọi giao dịch, theo ngày.',

  /** Shown while the first page of transactions is in flight. */
  loading: 'Đang tải giao dịch…',

  /** No transactions at all — the account has never been used. */
  emptyTitle: 'Chưa có giao dịch nào',
  emptyBody: 'Sổ cái trống. Giao dịch sẽ xuất hiện ở đây sau khi được nhập.',

  /** Transactions exist, but the current filters match none of them. */
  noMatchTitle: 'Không có giao dịch nào khớp bộ lọc',
  noMatchBody: 'Thử nới rộng khoảng ngày, đổi tài khoản hoặc xóa từ khóa tìm kiếm.',

  errorTitle: 'Không tải được sổ cái',

  columns: {
    date: 'Ngày',
    description: 'Mô tả',
    account: 'Tài khoản',
    category: 'Danh mục',
    amount: 'Số tiền',
  },

  /** `category_id: null` is a real state, not missing data. */
  uncategorized: 'Chưa phân loại',
  unknownAccount: 'Tài khoản không xác định',

  /** `{count}` is replaced with the number of matching transactions. */
  resultCount: '{count} giao dịch',
} as const;

export const filterCopy = {
  legend: 'Bộ lọc',
  from: 'Từ ngày',
  to: 'Đến ngày',
  account: 'Tài khoản',
  category: 'Danh mục',
  search: 'Tìm trong mô tả',
  searchPlaceholder: 'ví dụ: cà phê',
  allAccounts: 'Tất cả tài khoản',
  allCategories: 'Tất cả danh mục',
  uncategorizedOnly: 'Chưa phân loại',
  reset: 'Xóa bộ lọc',
} as const;

/** One message per machine-readable parse rejection. No coercion, no silence. */
export const amountErrorCopy: Record<ParseAmountFailure, string> = {
  EMPTY: 'Chưa nhập số tiền.',
  DECIMAL_NOT_ALLOWED: 'Số tiền phải là số nguyên đồng — không có phần thập phân.',
  MALFORMED_GROUPING: 'Sai cách nhóm hàng nghìn. Ví dụ đúng: 30.000',
  INVALID_CHARACTERS: 'Số tiền chỉ gồm chữ số và dấu chấm ngăn hàng nghìn.',
  OUT_OF_RANGE: 'Số tiền vượt quá giới hạn cho phép.',
};
