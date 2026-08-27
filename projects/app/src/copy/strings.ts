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
    /**
     * The landing route since hub ticket 0004 phase 5 — balances and the month,
     * the two questions the product exists to answer. It is FIRST in the nav
     * because it is where a sign-in lands.
     */
    dashboard: 'Tổng quan',
    /**
     * No longer the landing route. Ticket 0003 said so out loud — *"a successful
     * login lands on the ledger … 0004 introduces the dashboard and moves the
     * landing route there"* — and phase 5 is where that happened. The ledger is
     * now `/ledger`.
     */
    ledger: 'Sổ cái',
    /** Balances, transfers, and archiving — hub ticket 0004 phases 1–2. */
    accounts: 'Tài khoản',
    /** Flat category CRUD — hub ticket 0004 phase 3. */
    categories: 'Danh mục',
    /**
     * The count chip in the pill nav.
     *
     * **It became a LINK in phase 5** (hub ticket 0003). Ticket 0005 left it a
     * status on purpose — *"the triage screen it will eventually link to does
     * not exist yet"* — and that is exactly the condition that has now changed:
     * `/triage` exists, and a count of things needing attention that cannot be
     * clicked is a scoreboard, not a workflow.
     */
    uncategorized: 'Chưa phân loại',
  },
  /** `{count}` is substituted. The accessible name of the count chip above. */
  uncategorizedCountLabel: '{count} giao dịch chưa phân loại',
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

  /**
   * The day group's subtotal (ticket 0005, theme C). `{amount}` arrives already
   * formatted by the money module — never assembled here.
   */
  dayTotalLabel: 'Tổng trong ngày: {amount}',
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
   * The skip option is the DEFAULT, and its wording is EXACTLY the ledger chip
   * (`Chưa phân loại`) so the choice made here is recognisable as the chip that
   * appears on the row.
   *
   * It lost its `(bỏ qua)` suffix in ticket 0005: theme C shows the closed
   * control as a chip on a single-line row, where this string is the widest
   * fixed element and four characters of parenthesis pushed the row to wrap.
   * The meaning did not go anywhere — `categoryHint` below is the control's
   * `title`, so "skipping is allowed" is still stated, just not in the chip.
   */
  skipCategory: 'Chưa phân loại',
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
 * The ledger row: editing and deleting (hub ticket 0003, phase 4 — edit half).
 * ------------------------------------------------------------------------- */

export const rowCopy = {
  /**
   * A ledger row's accessible name. It carries the keyboard contract because
   * the row IS the control: one tab stop per row, `Enter` to edit, `Delete` to
   * delete. `{description}`, `{amount}` and `{date}` are substituted; the amount
   * arrives already formatted by the money module.
   */
  rowLabel: 'Sửa giao dịch {description}, {amount}, ngày {date}. Enter để sửa, Delete để xóa.',
  /** Shown once above the list, so the keyboard model is discoverable at all. */
  listHint: 'Tab tới một dòng rồi Enter để sửa, Delete để xóa. Hoàn tác luôn có sẵn.',

  editing: 'Đang sửa giao dịch',
  save: 'Lưu',
  cancel: 'Hủy',
  delete: 'Xóa',
  /** `{description}` is substituted — the delete button names what it removes. */
  deleteLabel: 'Xóa giao dịch {description}',

  /** `{description}` / `{amount}` — the undo bar after a delete. */
  deleted: 'Đã xóa: {description} · {amount}',
  /**
   * Deleting one leg of a transfer deletes BOTH (ticket 0004 phase 2). Half a
   * transfer is not a smaller transfer, it is a wrong balance — so the bar says
   * what actually happened rather than reporting the one row that was pressed.
   * `{description}` / `{amount}` are substituted.
   */
  deletedTransfer: 'Đã xóa cả hai vế của chuyển khoản: {description} · {amount}',
  undo: 'Hoàn tác',
  dismiss: 'Đóng',

  /** `{description}` / `{amount}` — the undo bar after a saved edit. */
  updated: 'Đã cập nhật: {description} · {amount}',
  /**
   * The edit saved a row that the active filter now excludes. Said out loud for
   * the same reason quick entry says it: a row that simply is not there reads as
   * data loss, and here the reader watched it vanish under their own cursor.
   */
  updatedHidden: 'Giao dịch đã lưu nhưng không còn khớp bộ lọc đang bật.',
  clearFilters: 'Xóa bộ lọc',
} as const;

/* ---------------------------------------------------------------------------
 * The uncategorised triage inbox (hub ticket 0003, phase 5).
 * ------------------------------------------------------------------------- */

export const triageCopy = {
  title: 'Chưa phân loại',
  subtitle: 'Bỏ qua danh mục lúc nhập, dọn một lượt ở đây.',

  /** `{count}` is substituted. Rendered in every state, including zero. */
  count: '{count} giao dịch chờ phân loại',

  /**
   * The keyboard contract, stated on the screen. This screen IS its keyboard
   * model — a user who does not know the keys has a list of rows and no way to
   * act on them, so this line is functional copy, not a hint.
   */
  keysTitle: 'Phím tắt',
  keys: [
    { key: '1 – 9', what: 'gán danh mục cho dòng đang chọn (hoặc cho cả vùng chọn)' },
    { key: '↑ ↓', what: 'di chuyển; giữ Shift để chọn nhiều dòng' },
    { key: 'Space', what: 'chọn / bỏ chọn dòng hiện tại' },
    { key: 'A', what: 'chọn tất cả' },
    { key: 'Esc', what: 'bỏ chọn' },
  ],

  /** The listbox's accessible name. */
  listLabel: 'Giao dịch chưa phân loại',
  /** `{description}`, `{amount}`, `{date}` — one row's accessible name. */
  rowLabel: '{description}, {amount}, ngày {date}',

  /** `{count}` — the selection counter above the list. */
  selectedCount: 'Đã chọn {count}',
  selectAll: 'Chọn tất cả',
  clearSelection: 'Bỏ chọn',

  /** The category legend. `{key}` is the digit that assigns it. */
  assignLabel: 'Gán danh mục {name} (phím {key})',
  /** Categories past the ninth have no digit — the legend says so rather than lying. */
  noKey: '—',

  /** Nothing left to triage. A terminal state, and it carries data-status="ready". */
  emptyTitle: 'Không còn giao dịch nào chưa phân loại',
  emptyBody: 'Mọi giao dịch đều đã có danh mục. Bỏ qua danh mục lúc nhập cũng được — chỗ này sẽ gom lại.',

  /** `{count}` / `{name}` — the undo bar after a batch assignment. */
  assigned: 'Đã gán {count} giao dịch vào {name}',
  undo: 'Hoàn tác',
  dismiss: 'Đóng',
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

/* ---------------------------------------------------------------------------
 * Accounts (hub ticket 0004, phase 1) and transfers (phase 2).
 * ------------------------------------------------------------------------- */

/** The three account kinds, named for a reader. Keys are `AccountKind`. */
export const accountKindCopy = {
  cash: 'Tiền mặt',
  bank: 'Ngân hàng',
  ewallet: 'Ví điện tử',
} as const;

export const accountsCopy = {
  title: 'Tài khoản',
  /**
   * The subtitle states the rule the screen is built on, because a balance
   * nobody can explain is a balance nobody trusts: it is DERIVED, every render,
   * from the opening balance plus the account's rows. There is no stored
   * balance anywhere in this product (hub ticket 0001 non-goal).
   */
  subtitle: 'Số dư được tính từ số dư đầu kỳ cộng các giao dịch — không lưu sẵn ở đâu cả.',

  /** `{count}` is substituted. Active accounts only; archived have their own line. */
  count: '{count} tài khoản đang dùng',
  totalLabel: 'Tổng số dư',
  openingLabel: 'Số dư đầu kỳ',
  balanceLabel: 'Số dư',
  /** `{count}` — how many rows an account holds. */
  txnCount: '{count} giao dịch',

  openLabel: 'Mở tài khoản {name}',
  open: 'Xem sổ',

  add: 'Thêm tài khoản',
  addLegend: 'Tài khoản mới',
  editLegend: 'Sửa tài khoản',
  editLabel: 'Sửa tài khoản {name}',
  edit: 'Sửa',

  name: 'Tên tài khoản',
  namePlaceholder: 'ví dụ: Techcombank',
  kind: 'Loại',
  opening: 'Số dư đầu kỳ',
  save: 'Lưu',
  cancel: 'Hủy',

  /**
   * Archive, never delete. An account with transactions cannot be removed
   * without orphaning history, so the destructive action on this screen is one
   * that keeps everything and simply stops offering the account for new entry.
   */
  archive: 'Lưu trữ',
  archiveLabel: 'Lưu trữ tài khoản {name}',
  unarchive: 'Dùng lại',
  unarchiveLabel: 'Dùng lại tài khoản {name}',
  archivedTitle: 'Đã lưu trữ',
  archivedNote:
    'Không còn hiện trong ô chọn tài khoản khi nhập hay khi chuyển tiền. Số dư và toàn bộ lịch sử vẫn còn nguyên.',
  /** `{name}` — the undo bar after archiving. */
  archived: 'Đã lưu trữ: {name}',
  /** `{name}` — the undo bar after un-archiving. */
  unarchived: 'Đã dùng lại: {name}',
  /** `{name}` / `{amount}` — the undo bar after a create or an edit. */
  created: 'Đã thêm tài khoản: {name} · {amount}',
  updated: 'Đã cập nhật tài khoản: {name}',
  undo: 'Hoàn tác',
  dismiss: 'Đóng',

  emptyTitle: 'Chưa có tài khoản nào',
  emptyBody: 'Thêm một tài khoản để bắt đầu theo dõi số dư.',

  /**
   * The line under the transfer bar that phase 2 has to hold still. `{count}`
   * is substituted. It names its own exclusion out loud, because a total that
   * quietly leaves something out is a total nobody can check.
   */
  spendingLabel: 'Tổng chi ({count} giao dịch, không gồm chuyển khoản):',

  detailBack: 'Tất cả tài khoản',
  detailNotFound: 'Không tìm thấy tài khoản này.',
  detailEmptyTitle: 'Tài khoản này chưa có giao dịch nào',
  detailEmptyBody: 'Số dư đang bằng đúng số dư đầu kỳ.',
} as const;

/** One message per account-form rejection. Amount reasons use `amountErrorCopy`. */
export const accountErrorCopy = {
  NAME_REQUIRED: 'Đặt tên cho tài khoản.',
  KIND_REQUIRED: 'Chọn loại tài khoản.',
} as const;

export const transferCopy = {
  legend: 'Chuyển tiền',
  title: 'Chuyển tiền',
  /**
   * The whole point of the feature, said on the screen. A transfer that quietly
   * behaved differently from an expense would be a rule the Owner has to take on
   * trust; this line is what makes it a promise the screen keeps.
   */
  note: 'Chuyển tiền không phải chi tiêu: hai vế dùng chung một mã chuyển khoản và không vào tổng chi hay báo cáo danh mục.',
  /** The keyboard contract, same shape as quick entry's hint line. */
  hint: 'Nhấn T để tới ô số tiền. Số tiền → Từ → Đến → Enter.',

  amount: 'Số tiền',
  amountPlaceholder: '500.000',
  from: 'Từ tài khoản',
  to: 'Đến tài khoản',
  description: 'Mô tả',
  date: 'Ngày',
  submit: 'Chuyển',

  /**
   * The description a transfer gets when none is typed. `{from}` / `{to}` are
   * substituted. It exists so the fast path costs no typing at all: a transfer
   * already says everything it needs to in its two accounts.
   */
  defaultDescription: 'Chuyển tiền: {from} → {to}',

  /** `{amount}` (already formatted) / `{from}` / `{to}` — the notice after a transfer. */
  saved: 'Đã chuyển {amount} · {from} → {to}. Không tính vào chi tiêu.',
  undo: 'Hoàn tác',
  dismiss: 'Đóng',

  /** The chip on a ledger row that is one leg of a transfer. */
  rowBadge: 'Chuyển khoản',
  /** `{from}` / `{to}` — the movement, rendered in place of a category. */
  movement: '{from} → {to}',
  /**
   * A transfer leg's accessible name. It says the two things a transfer row
   * does differently from every other row: it is not edited one leg at a time,
   * and deleting it takes both legs.
   */
  rowLabel:
    'Chuyển khoản {movement}, {amount}, ngày {date}. Không sửa riêng từng vế; Delete để xóa cả cặp.',
  unknownAccount: 'Tài khoản không xác định',

  needTwoAccounts: 'Cần ít nhất hai tài khoản đang dùng thì mới chuyển tiền được.',
} as const;

/** One message per transfer rejection. Amount reasons use `amountErrorCopy`. */
export const transferErrorCopy = {
  SAME_ACCOUNT: 'Chọn hai tài khoản khác nhau — chuyển vào chính nó thì không đi đâu cả.',
  AMOUNT_ZERO: 'Số tiền chuyển phải lớn hơn 0.',
  ACCOUNT_REQUIRED: 'Chọn tài khoản.',
  DATE_INVALID: 'Ngày phải là một ngày lịch hợp lệ.',
} as const;

/* ---------------------------------------------------------------------------
 * Categories (hub ticket 0004, phase 3) — flat, and deleting one keeps its rows.
 * ------------------------------------------------------------------------- */

export const categoriesCopy = {
  title: 'Danh mục',
  /**
   * The subtitle states the two rules the screen is built on, because both are
   * surprising if you meet them by accident: deleting keeps the transactions,
   * and the list is ordered by name — which is what the swatch and the triage
   * digit are derived from, so renaming moves both.
   */
  subtitle:
    'Danh mục phẳng, không có danh mục con. Xóa một danh mục thì giao dịch của nó chuyển về Chưa phân loại, không bị xóa theo.',
  /** `{count}` is substituted. Rendered in every state, including zero. */
  count: '{count} danh mục',

  /** The column headings over the list. */
  colName: 'Tên',
  colKey: 'Phím',
  colUsage: 'Giao dịch',

  /**
   * The order note above the list. It is functional copy, not decoration: the
   * swatch and the digit key are both positions in this list, so a rename or a
   * create moves them, and the screen that causes it is the screen that has to
   * say so.
   */
  orderNote:
    'Xếp theo tên. Màu và phím tắt 1–9 lấy theo thứ tự này, nên đổi tên hoặc thêm danh mục sẽ xếp lại cả hai.',
  /** Categories past the ninth get no digit. Same `—` the triage legend renders. */
  noKey: '—',
  /** `{count}` — how many transactions are filed under a category right now. */
  usage: '{count} giao dịch',

  add: 'Thêm danh mục',
  addLegend: 'Danh mục mới',
  editLegend: 'Đổi tên danh mục',
  editLabel: 'Đổi tên danh mục {name}',
  edit: 'Đổi tên',
  name: 'Tên danh mục',
  namePlaceholder: 'ví dụ: Quà tặng',
  save: 'Lưu',
  cancel: 'Hủy',

  /**
   * Delete. There is no confirmation dialog here or anywhere on this surface
   * (design-system.md §3.9) — the action happens and the undo bar offers to take
   * it back, with the caret already on it.
   */
  remove: 'Xóa',
  removeLabel: 'Xóa danh mục {name}',
  /** `{name}` / `{count}` — the undo bar after deleting a category with rows. */
  removed: 'Đã xóa danh mục {name} · {count} giao dịch chuyển về Chưa phân loại',
  /** `{name}` — the undo bar after deleting a category nothing was filed under. */
  removedEmpty: 'Đã xóa danh mục {name}',
  undo: 'Hoàn tác',
  dismiss: 'Đóng',

  emptyTitle: 'Chưa có danh mục nào',
  emptyBody: 'Thêm một danh mục để bắt đầu phân loại chi tiêu.',
} as const;

/** One message per category-form rejection. */
export const categoryErrorCopy = {
  NAME_REQUIRED: 'Đặt tên cho danh mục.',
  NAME_TAKEN: 'Đã có danh mục trùng tên.',
} as const;

/* ---------------------------------------------------------------------------
 * The dashboard (hub ticket 0004, phase 5) — the landing route.
 * ------------------------------------------------------------------------- */

export const dashboardCopy = {
  title: 'Tổng quan',
  /**
   * What the screen is for, stated on it. The two questions are the product's
   * two questions, and they are the two panels below in that order.
   */
  subtitle: 'Bạn đang có bao nhiêu, và tháng này tiền đi đâu.',

  /** The balances panel. Active accounts only — archived have their own screen. */
  balancesTitle: 'Số dư',
  totalLabel: 'Tổng số dư',
  /** `{count}` is substituted. */
  accountCount: '{count} tài khoản đang dùng',
  /**
   * Repeated from the accounts screen on purpose: a balance nobody can explain
   * is a balance nobody trusts, and the dashboard is the screen most likely to
   * be read without ever opening `/accounts`.
   */
  derivedNote: 'Tính từ số dư đầu kỳ cộng các giao dịch — không lưu sẵn ở đâu cả.',
  openAccounts: 'Quản lý tài khoản và chuyển tiền',
  openLedger: 'Mở sổ cái',
  /** `{name}` — one account row's accessible name. */
  openAccountLabel: 'Mở tài khoản {name}',

  emptyTitle: 'Chưa có tài khoản nào',
  emptyBody: 'Thêm một tài khoản để bắt đầu theo dõi số dư.',
} as const;

/* ---------------------------------------------------------------------------
 * The month band (hub ticket 0004, phase 4) — theme C's summary strip.
 * ------------------------------------------------------------------------- */

export const monthCopy = {
  /** `{month}` / `{year}` — the eyebrow over the headline figure. */
  label: 'Tháng {month} · {year}',

  /** The three figures, per the artboard. */
  spent: 'đã chi',
  earned: 'Đã thu',
  net: 'Chênh lệch',
  txnCount: 'Giao dịch',

  prev: 'Tháng trước',
  next: 'Tháng sau',

  /**
   * The allocation bar's own heading. It names its exclusion out loud, for the
   * same reason the accounts screen's spending line does: a total that quietly
   * leaves something out is a total nobody can check.
   */
  allocationTitle: 'Tiền đi đâu',
  allocationNote: 'Không gồm chuyển khoản — chuyển tiền là đổi chỗ, không phải chi tiêu.',
  /** The bar's accessible name. `{month}` / `{year}` are substituted. */
  allocationLabel: 'Phân bổ chi tiêu tháng {month} năm {year}',

  /** Uncategorised is a STATE, not a category — same wording as the ledger chip. */
  uncategorized: 'Chưa phân loại',

  /**
   * The line under the bar, and the reason the band exists. Three states, chosen
   * from the data — never asserted:
   *
   *   `over-half` is the canvas note verbatim, and it is the acceptance test the
   *   design canvas wrote for this band. It fires when more than half of the
   *   month's spending has no category.
   *   `some` states the amount instead, so a smaller number still reads as a
   *   number rather than as an alarm. The amount goes LAST in the sentence on
   *   purpose: it arrives from `formatAmount` carrying its real minus sign
   *   (sign is direction — design-system.md §3.3), and a signed figure reads as
   *   a figure at the end of a clause and as a typo at the start of one.
   *   `clear` is the terminal state — nothing to triage.
   *
   * `{amount}` arrives already formatted by the money module.
   */
  noteOverHalf: 'Hơn một nửa chi tiêu tháng này chưa biết đi đâu.',
  noteSome: 'Chi tiêu tháng này chưa biết đi đâu: {amount}.',
  noteClear: 'Mọi chi tiêu tháng này đều đã có danh mục.',
  /** The link into the inbox. `{count}` is the WHOLE inbox, matching the badge. */
  triageAction: 'Phân loại {count} giao dịch',

  /** No transactions at all in the selected month. A terminal state. */
  emptyMonth: 'Tháng này chưa có giao dịch nào.',
  /** Transactions exist but none of them is spending — only income, or only transfers. */
  noSpending: 'Tháng này chưa có khoản chi nào.',
} as const;
