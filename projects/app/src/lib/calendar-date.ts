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

import type { CalendarDate } from '../api/types';

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
