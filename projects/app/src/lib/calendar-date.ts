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
