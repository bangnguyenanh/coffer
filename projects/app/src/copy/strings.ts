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
  /**
   * The way out. Wording stays the conventional 'Đăng xuất' — but now that more
   * than one account can exist in a session, WHICH account you are signed in as
   * is load-bearing, so the shell shows the email beside it and the button's
   * accessible name names the account it signs out. `{email}` is substituted.
   */
  signOut: 'Đăng xuất',
  signOutLabel: 'Đăng xuất khỏi {email}',
} as const;

export const ledgerCopy = {
  title: 'Sổ cái',
  subtitle: 'Mọi giao dịch, theo ngày.',

  /** No transactions at all — the account has never been used. */
  emptyTitle: 'Chưa có giao dịch nào',
  emptyBody: 'Sổ cái trống. Giao dịch sẽ xuất hiện ở đây sau khi được nhập.',

  /** Transactions exist, but the current filters match none of them. */
  noMatchTitle: 'Không có giao dịch nào khớp bộ lọc',
  noMatchBody: 'Thử nới rộng khoảng ngày, đổi tài khoản hoặc xóa từ khóa tìm kiếm.',

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

/* ---------------------------------------------------------------------------
 * Quick entry (hub ticket 0003, phase 4).
 * ------------------------------------------------------------------------- */

export const quickEntryCopy = {
  legend: 'Nhập nhanh',
  /**
   * The whole keyboard contract, in one line, above the fields. It is here
   * because a keyboard-first surface that does not SAY it is keyboard-first is
   * a mouse surface with a shortcut nobody finds.
   */
  hint: 'Gõ số tiền rồi Enter. Dấu − là chi, dấu + là thu. Nhấn N để quay lại ô số tiền.',

  direction: {
    legend: 'Hướng',
    outflow: 'Chi',
    inflow: 'Thu',
    /** Spelled out for screen readers — `Chi`/`Thu` differ by one letter. */
    outflowLabel: 'Chi — tiền ra khỏi tài khoản',
    inflowLabel: 'Thu — tiền vào tài khoản',
    /** `{current}` / `{other}` are substituted with the two labels above. */
    toggleLabel: 'Hướng giao dịch: {current}. Bấm để đổi sang {other}.',
  },

  amount: 'Số tiền',
  amountPlaceholder: '30.000',
  /** Shown while the typed amount parses, so the stored value is visible before saving. */
  previewLabel: 'Sẽ lưu:',

  description: 'Mô tả',
  descriptionPlaceholder: 'ví dụ: Cà phê sáng',

  category: 'Danh mục',
  /**
   * The skip option is the DEFAULT and says what skipping means. Wording matches
   * the ledger chip (`Chưa phân loại`) so the choice made here is recognisable
   * as the chip that appears on the row.
   */
  skipCategory: 'Chưa phân loại (bỏ qua)',
  categoryHint: 'Bỏ qua được — phân loại sau.',

  account: 'Tài khoản',
  date: 'Ngày',

  submit: 'Lưu',

  /** `{description}` and `{amount}` are substituted. The amount is already formatted. */
  saved: 'Đã lưu: {description} · {amount}',
  /**
   * The row was saved AND is not on screen, because the active filter excludes
   * it. Saying nothing here is what would read as data loss.
   */
  savedHidden: 'Giao dịch đã được lưu nhưng không khớp bộ lọc đang bật, nên chưa hiện trong danh sách.',
  savedShow: 'Xóa bộ lọc để xem',
} as const;

/** One message per non-amount rejection. Amount reasons use `amountErrorCopy`. */
export const entryErrorCopy = {
  DESCRIPTION_REQUIRED: 'Nhập mô tả, để sau này còn nhận ra giao dịch này.',
  DATE_INVALID: 'Ngày phải là một ngày lịch hợp lệ.',
  ACCOUNT_REQUIRED: 'Chọn tài khoản.',
} as const;

/* ---------------------------------------------------------------------------
 * The auth surface. Screens only — see `src/auth/AuthProvider.tsx`.
 * ------------------------------------------------------------------------- */

export const signupCopy = {
  /**
   * A conventional sign up screen, permanently reachable — NOT first-run
   * provisioning (Owner directive 2026-08-25). The copy says nothing about
   * "the only account on this machine" any more, because that is exactly the
   * claim the Owner has put back on the table.
   */
  title: 'Đăng ký',
  subtitle: 'Tạo tài khoản Coffer để bắt đầu ghi chi tiêu.',
  email: 'Email',
  emailPlaceholder: 'ban@vidu.com',
  password: 'Mật khẩu',
  passwordHint: 'Ít nhất 8 ký tự.',
  confirm: 'Nhập lại mật khẩu',
  submit: 'Đăng ký',
} as const;

export const loginCopy = {
  title: 'Đăng nhập',
  subtitle: 'Mở sổ chi tiêu của bạn.',
  email: 'Email',
  emailPlaceholder: 'ban@vidu.com',
  password: 'Mật khẩu',
  submit: 'Đăng nhập',
} as const;

/**
 * The cross-links that make the two screens a pair.
 *
 * Each screen names the other one and links to it, both ways. This is the part
 * that makes the surface read as an ordinary signed-up product rather than as
 * provisioning, so the prompt and the link text are kept together here where a
 * change to one cannot silently drift from the other.
 */
export const authLinkCopy = {
  toSignup: { prompt: 'Chưa có tài khoản?', action: 'Đăng ký' },
  toLogin: { prompt: 'Đã có tài khoản?', action: 'Đăng nhập' },
} as const;

/**
 * One message per machine-readable failure code.
 *
 * The auth state returns a CODE; the Vietnamese the Owner reads is chosen here,
 * so the wording of an error state is a copy edit rather than a logic edit.
 *
 * `invalid_credentials` covers an unknown email AND a wrong password, and the
 * wording keeps them indistinguishable on purpose — naming which half was wrong
 * is an account-enumeration leak.
 */
export const authErrorCopy: Record<string, string> = {
  invalid_credentials: 'Email hoặc mật khẩu không đúng.',
  email_taken: 'Email này đã được đăng ký. Hãy đăng nhập.',
  invalid_email: 'Email không hợp lệ.',
  weak_password: 'Mật khẩu phải có ít nhất 8 ký tự.',
  invalid_body: 'Thiếu email hoặc mật khẩu.',
  password_mismatch: 'Hai lần nhập mật khẩu không khớp.',
};

/** Anything unmapped still says something, rather than failing silently. */
export const authErrorFallback = 'Không thực hiện được. Vui lòng thử lại.';
