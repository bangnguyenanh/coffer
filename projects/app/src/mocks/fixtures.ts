/**
 * Seed data for the mock network layer.
 *
 * Not placeholder data: these are ordinary Vietnamese personal-finance
 * transactions at realistic magnitudes, because the point of the prototype is
 * to find out whether the ledger and the money module hold up at real numbers.
 *
 * VND, exponent 0 (ADR 0003): `amount_minor` is đồng. A 30.000 ₫ coffee is
 * `30000`, NOT `3000000`.
 *
 * The set deliberately covers the awkward cases, not only the tidy ones:
 *   - inflows (positive) alongside outflows (negative)
 *   - a zero-amount transaction (`txn_047`)
 *   - one very large amount, ~10^9 đồng (`txn_033`)
 *   - uncategorized transactions, `category_id: null` (`txn_017`, `txn_033`,
 *     `txn_052`, `txn_056`)
 *   - an account with no transactions at all (`acc_tpb_savings`)
 *   - several transactions sharing a date (2026-06-05, 2026-08-15, 2026-08-22)
 *
 * No transfers: the transfer model is an open decision (hub ticket 0004).
 */

import type { Account, Category, Transaction } from '../api/types';

export const seedAccounts: readonly Account[] = [
  { id: 'acc_cash', name: 'Tiền mặt', kind: 'cash', opening_balance_minor: 2000000 },
  { id: 'acc_vcb', name: 'Vietcombank', kind: 'bank', opening_balance_minor: 18500000 },
  { id: 'acc_momo', name: 'Ví Momo', kind: 'ewallet', opening_balance_minor: 850000 },
  // Deliberately has zero transactions.
  { id: 'acc_tpb_savings', name: 'Tiết kiệm TPBank', kind: 'bank', opening_balance_minor: 60000000 },
];

/** Flat — nested categories are an open decision, out of scope for 0003. */
export const seedCategories: readonly Category[] = [
  { id: 'cat_food', name: 'Ăn uống' },
  { id: 'cat_transport', name: 'Đi lại' },
  { id: 'cat_grocery', name: 'Chợ & siêu thị' },
  { id: 'cat_bills', name: 'Hóa đơn' },
  { id: 'cat_coffee', name: 'Cà phê' },
  { id: 'cat_fun', name: 'Giải trí' },
  { id: 'cat_health', name: 'Sức khỏe' },
  { id: 'cat_salary', name: 'Lương' },
];

export const seedTransactions: readonly Transaction[] = [
  { id: 'txn_001', occurred_on: '2026-05-25', amount_minor: -35000, description: 'Cà phê sữa đá Highlands', account_id: 'acc_momo', category_id: 'cat_coffee' },
  { id: 'txn_002', occurred_on: '2026-05-25', amount_minor: -60000, description: 'Cơm tấm sườn bì', account_id: 'acc_cash', category_id: 'cat_food' },
  { id: 'txn_003', occurred_on: '2026-05-26', amount_minor: -45000, description: 'Grab về nhà', account_id: 'acc_momo', category_id: 'cat_transport' },
  { id: 'txn_004', occurred_on: '2026-05-27', amount_minor: -320000, description: 'Đi chợ Bà Chiểu', account_id: 'acc_cash', category_id: 'cat_grocery' },
  { id: 'txn_005', occurred_on: '2026-05-28', amount_minor: -180000, description: 'Vé xem phim CGV', account_id: 'acc_vcb', category_id: 'cat_fun' },
  { id: 'txn_006', occurred_on: '2026-05-30', amount_minor: -1240000, description: 'Tiền điện tháng 5', account_id: 'acc_vcb', category_id: 'cat_bills' },
  { id: 'txn_007', occurred_on: '2026-05-31', amount_minor: -75000, description: 'Bún bò Huế', account_id: 'acc_cash', category_id: 'cat_food' },

  { id: 'txn_008', occurred_on: '2026-06-01', amount_minor: -5000000, description: 'Tiền thuê nhà tháng 6', account_id: 'acc_vcb', category_id: 'cat_bills' },
  { id: 'txn_009', occurred_on: '2026-06-02', amount_minor: -30000, description: 'Cà phê Ông Bầu', account_id: 'acc_cash', category_id: 'cat_coffee' },
  { id: 'txn_010', occurred_on: '2026-06-03', amount_minor: -250000, description: 'Siêu thị Co.opmart', account_id: 'acc_vcb', category_id: 'cat_grocery' },
  // Three transactions on 2026-06-05 — same-date ordering.
  { id: 'txn_011', occurred_on: '2026-06-05', amount_minor: 25000000, description: 'Lương tháng 5', account_id: 'acc_vcb', category_id: 'cat_salary' },
  { id: 'txn_012', occurred_on: '2026-06-05', amount_minor: -120000, description: 'Nạp tiền điện thoại', account_id: 'acc_momo', category_id: 'cat_bills' },
  { id: 'txn_013', occurred_on: '2026-06-05', amount_minor: -50000, description: 'Cơm trưa văn phòng', account_id: 'acc_cash', category_id: 'cat_food' },
  { id: 'txn_014', occurred_on: '2026-06-08', amount_minor: -450000, description: 'Khám răng định kỳ', account_id: 'acc_vcb', category_id: 'cat_health' },
  { id: 'txn_015', occurred_on: '2026-06-10', amount_minor: -40000, description: 'Grab tới công ty', account_id: 'acc_momo', category_id: 'cat_transport' },
  { id: 'txn_016', occurred_on: '2026-06-12', amount_minor: -85000, description: 'Trà sữa với đồng nghiệp', account_id: 'acc_momo', category_id: 'cat_food' },
  // Uncategorized.
  { id: 'txn_017', occurred_on: '2026-06-15', amount_minor: -2200000, description: 'Mua điện thoại cũ cho mẹ', account_id: 'acc_vcb', category_id: null },
  { id: 'txn_018', occurred_on: '2026-06-18', amount_minor: -30000, description: 'Cà phê bệt', account_id: 'acc_cash', category_id: 'cat_coffee' },
  { id: 'txn_019', occurred_on: '2026-06-20', amount_minor: -500000, description: 'Đi chợ cuối tuần', account_id: 'acc_cash', category_id: 'cat_grocery' },
  { id: 'txn_020', occurred_on: '2026-06-22', amount_minor: -220000, description: 'Vé xe khách về quê', account_id: 'acc_vcb', category_id: 'cat_transport' },
  { id: 'txn_021', occurred_on: '2026-06-25', amount_minor: -65000, description: 'Phở gà', account_id: 'acc_cash', category_id: 'cat_food' },
  { id: 'txn_022', occurred_on: '2026-06-28', amount_minor: -350000, description: 'Thuốc và vitamin', account_id: 'acc_momo', category_id: 'cat_health' },
  { id: 'txn_023', occurred_on: '2026-06-30', amount_minor: -890000, description: 'Hóa đơn internet và truyền hình', account_id: 'acc_vcb', category_id: 'cat_bills' },

  { id: 'txn_024', occurred_on: '2026-07-01', amount_minor: -5000000, description: 'Tiền thuê nhà tháng 7', account_id: 'acc_vcb', category_id: 'cat_bills' },
  { id: 'txn_025', occurred_on: '2026-07-03', amount_minor: -30000, description: 'Cà phê muối', account_id: 'acc_momo', category_id: 'cat_coffee' },
  { id: 'txn_026', occurred_on: '2026-07-05', amount_minor: 25000000, description: 'Lương tháng 6', account_id: 'acc_vcb', category_id: 'cat_salary' },
  { id: 'txn_027', occurred_on: '2026-07-05', amount_minor: 1500000, description: 'Thưởng dự án', account_id: 'acc_vcb', category_id: 'cat_salary' },
  { id: 'txn_028', occurred_on: '2026-07-06', amount_minor: -55000, description: 'Bánh mì và cà phê sáng', account_id: 'acc_cash', category_id: 'cat_food' },
  { id: 'txn_029', occurred_on: '2026-07-09', amount_minor: -45000, description: 'Grab đi họp khách hàng', account_id: 'acc_momo', category_id: 'cat_transport' },
  { id: 'txn_030', occurred_on: '2026-07-11', amount_minor: -1350000, description: 'Tiền điện tháng 6', account_id: 'acc_vcb', category_id: 'cat_bills' },
  { id: 'txn_031', occurred_on: '2026-07-13', amount_minor: -280000, description: 'Siêu thị Bách Hóa Xanh', account_id: 'acc_cash', category_id: 'cat_grocery' },
  { id: 'txn_032', occurred_on: '2026-07-15', amount_minor: -150000, description: 'Karaoke sinh nhật bạn', account_id: 'acc_momo', category_id: 'cat_fun' },
  // ~10^9 đồng, and uncategorized: the largest magnitude the formatter has to hold.
  { id: 'txn_033', occurred_on: '2026-07-18', amount_minor: -1250000000, description: 'Đặt cọc mua căn hộ Thủ Đức', account_id: 'acc_vcb', category_id: null },
  { id: 'txn_034', occurred_on: '2026-07-20', amount_minor: -70000, description: 'Lẩu cá kèo', account_id: 'acc_cash', category_id: 'cat_food' },
  { id: 'txn_035', occurred_on: '2026-07-22', amount_minor: -30000, description: 'Cà phê sáng', account_id: 'acc_cash', category_id: 'cat_coffee' },
  { id: 'txn_036', occurred_on: '2026-07-25', amount_minor: -95000, description: 'Xăng xe máy', account_id: 'acc_cash', category_id: 'cat_transport' },
  { id: 'txn_037', occurred_on: '2026-07-27', amount_minor: -420000, description: 'Đi chợ Tân Định', account_id: 'acc_cash', category_id: 'cat_grocery' },
  { id: 'txn_038', occurred_on: '2026-07-29', amount_minor: -199000, description: 'Gói Spotify và Netflix', account_id: 'acc_vcb', category_id: 'cat_fun' },
  { id: 'txn_039', occurred_on: '2026-07-31', amount_minor: -640000, description: 'Hóa đơn nước và rác', account_id: 'acc_vcb', category_id: 'cat_bills' },

  { id: 'txn_040', occurred_on: '2026-08-01', amount_minor: -5000000, description: 'Tiền thuê nhà tháng 8', account_id: 'acc_vcb', category_id: 'cat_bills' },
  { id: 'txn_041', occurred_on: '2026-08-02', amount_minor: -30000, description: 'Cà phê Trung Nguyên', account_id: 'acc_momo', category_id: 'cat_coffee' },
  { id: 'txn_042', occurred_on: '2026-08-04', amount_minor: -80000, description: 'Cơm gà Hải Nam', account_id: 'acc_cash', category_id: 'cat_food' },
  { id: 'txn_043', occurred_on: '2026-08-05', amount_minor: 25000000, description: 'Lương tháng 7', account_id: 'acc_vcb', category_id: 'cat_salary' },
  { id: 'txn_044', occurred_on: '2026-08-07', amount_minor: -45000, description: 'Grab ra bến xe miền Đông', account_id: 'acc_momo', category_id: 'cat_transport' },
  { id: 'txn_045', occurred_on: '2026-08-09', amount_minor: -310000, description: 'Siêu thị cuối tuần', account_id: 'acc_vcb', category_id: 'cat_grocery' },
  { id: 'txn_046', occurred_on: '2026-08-12', amount_minor: -1200000, description: 'Khám sức khỏe tổng quát', account_id: 'acc_vcb', category_id: 'cat_health' },
  // Zero: a cancelled ride refunded in full. Zero is a real amount, not empty.
  { id: 'txn_047', occurred_on: '2026-08-14', amount_minor: 0, description: 'Hoàn tiền chuyến Grab đã huỷ', account_id: 'acc_momo', category_id: 'cat_transport' },
  // Three transactions on 2026-08-15 — same-date ordering.
  { id: 'txn_048', occurred_on: '2026-08-15', amount_minor: -35000, description: 'Cà phê chiều', account_id: 'acc_cash', category_id: 'cat_coffee' },
  { id: 'txn_049', occurred_on: '2026-08-15', amount_minor: -65000, description: 'Bún chả Hà Nội', account_id: 'acc_cash', category_id: 'cat_food' },
  { id: 'txn_050', occurred_on: '2026-08-15', amount_minor: -240000, description: 'Đi chợ sáng', account_id: 'acc_cash', category_id: 'cat_grocery' },
  { id: 'txn_051', occurred_on: '2026-08-17', amount_minor: -180000, description: 'Vé concert Hà Anh Tuấn', account_id: 'acc_momo', category_id: 'cat_fun' },
  { id: 'txn_052', occurred_on: '2026-08-19', amount_minor: -150000, description: 'Sách và văn phòng phẩm', account_id: 'acc_vcb', category_id: null },
  { id: 'txn_053', occurred_on: '2026-08-20', amount_minor: -30000, description: 'Cà phê sữa', account_id: 'acc_momo', category_id: 'cat_coffee' },
  // Three transactions on 2026-08-22 — today, same-date ordering.
  { id: 'txn_054', occurred_on: '2026-08-22', amount_minor: -50000, description: 'Cơm trưa', account_id: 'acc_cash', category_id: 'cat_food' },
  { id: 'txn_055', occurred_on: '2026-08-22', amount_minor: -45000, description: 'Grab về nhà', account_id: 'acc_momo', category_id: 'cat_transport' },
  { id: 'txn_056', occurred_on: '2026-08-22', amount_minor: 200000, description: 'Bạn trả nợ tiền ăn', account_id: 'acc_cash', category_id: null },
];
