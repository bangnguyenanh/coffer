/**
 * Calendar dates — the display half of the date contract.
 *
 * Hub CLAUDE.md: `occurred_on` is a calendar date `YYYY-MM-DD` in the Owner's
 * local zone, NOT a timestamp. A transaction happens on a day.
 *
 * That is why nothing here goes through `new Date('2026-08-22')`: that parses
 * as UTC midnight and renders as the previous day west of Greenwich. The parts
 * are read off the string and handed to a local-time constructor instead.
 *
 * Like money formatting, this is centralized: no component formats a date.
 */

import type { CalendarDate } from '../data/types';

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** `2026-08-22` -> `22/08/2026`. Throws on anything that is not a calendar date. */
export function formatCalendarDate(value: CalendarDate): string {
  const match = CALENDAR_DATE.exec(value);
  if (match === null) {
    throw new TypeError(`Expected a calendar date in YYYY-MM-DD form; received ${value}`);
  }
  const [, year, month, day] = match;
  // Local-time constructor: no zone shift, no off-by-one-day.
  return dateFormatter.format(new Date(Number(year), Number(month) - 1, Number(day)));
}

const dayHeadingFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/**
 * `2026-08-22` -> `Thứ Bảy, 22 tháng 8` — the heading over a ledger day group
 * (ticket 0005, theme C).
 *
 * The year is deliberately absent: a day group sits inside a list that is
 * already ordered by date, and the row itself still carries the full date in
 * `data-occurred-on`. Same local-time construction as `formatCalendarDate`, for
 * the same reason — a UTC parse renders the previous day west of Greenwich.
 */
export function formatDayHeading(value: CalendarDate): string {
  const match = CALENDAR_DATE.exec(value);
  if (match === null) {
    throw new TypeError(`Expected a calendar date in YYYY-MM-DD form; received ${value}`);
  }
  const [, year, month, day] = match;
  return dayHeadingFormatter.format(new Date(Number(year), Number(month) - 1, Number(day)));
}

/** Is this string a calendar date? The type guard the entry form validates with. */
export function isCalendarDate(value: string): value is CalendarDate {
  return CALENDAR_DATE.test(value);
}

/**
 * Today, as a calendar date in the Owner's LOCAL zone.
 *
 * Deliberately not `new Date().toISOString().slice(0, 10)`. That is UTC, and
 * Vietnam is UTC+7: before 07:00 local it names YESTERDAY, so the default date
 * on the entry form would silently be wrong for the first seven hours of every
 * day — the hours somebody actually logs a breakfast. The parts are read off the
 * local-time getters instead, for the same reason `formatCalendarDate` refuses
 * `new Date('2026-08-22')`.
 */
export function todayCalendarDate(): CalendarDate {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/* ---------------------------------------------------------------------------
 * Months — the month band's half of the date contract (hub ticket 0004 phase 4).
 * ------------------------------------------------------------------------- */

/**
 * A calendar MONTH, `YYYY-MM`.
 *
 * The same reasoning as `CalendarDate`: a month is a label, not an instant, and
 * it is never a `Date`. Making it a string keeps `occurred_on.slice(0, 7)`
 * correct by construction — no zone, no rollover, no month that is 31 days long
 * in one place and 30 in another.
 */
export type MonthKey = string;

const MONTH_KEY = /^(\d{4})-(\d{2})$/;

/** Is this string a month key? */
export function isMonthKey(value: string): value is MonthKey {
  return MONTH_KEY.test(value);
}

/** The month a calendar date falls in. `2026-08-19` -> `2026-08`. */
export function monthKeyOf(value: CalendarDate): MonthKey {
  const match = CALENDAR_DATE.exec(value);
  if (match === null) {
    throw new TypeError(`Expected a calendar date in YYYY-MM-DD form; received ${value}`);
  }
  return value.slice(0, 7);
}

/** This month, in the Owner's LOCAL zone — same reasoning as `todayCalendarDate`. */
export function currentMonthKey(): MonthKey {
  return monthKeyOf(todayCalendarDate());
}

/**
 * The year and the (1-based, un-padded) month of a month key, as strings.
 *
 * It returns PARTS rather than a formatted label because the label itself is
 * copy — `Tháng {month} · {year}` lives in `src/copy/strings.ts` like every
 * other user-facing string, and a module in `lib/` does not get to type
 * Vietnamese. Same division of labour as the amount modules: this file knows
 * what a month IS, `strings.ts` knows what it is CALLED.
 */
export function monthKeyParts(month: MonthKey): { readonly year: string; readonly month: string } {
  const match = MONTH_KEY.exec(month);
  if (match === null) {
    throw new TypeError(`Expected a month in YYYY-MM form; received ${month}`);
  }
  const [, year, monthPart] = match;
  return { year: year ?? '', month: String(Number(monthPart)) };
}
