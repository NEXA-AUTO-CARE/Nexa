/** System setting key holding the admin-managed list of blocked booking days. */
export const BLOCKED_BOOKING_DATES_KEY = 'blocked_booking_dates';

/** Time zone the business operates in; blocked days are calendar days in this zone. */
export const BUSINESS_TIME_ZONE = 'Europe/London';

export interface BlockedBookingDate {
  /** Calendar day in YYYY-MM-DD format (business time zone). */
  date: string;
  /** Optional admin note, e.g. "Staff holiday". */
  reason?: string;
}

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: unknown): value is string {
  return typeof value === 'string' && DATE_KEY_REGEX.test(value);
}

/**
 * Parse the raw `blocked_booking_dates` setting value. Tolerates a missing or
 * malformed value (returns []) and plain string entries. Result is de-duplicated
 * and sorted ascending by date.
 */
export function parseBlockedBookingDates(
  raw: string | null | undefined,
): BlockedBookingDate[] {
  if (!raw || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const byDate = new Map<string, BlockedBookingDate>();
  for (const entry of parsed) {
    if (isValidDateKey(entry)) {
      byDate.set(entry, { date: entry });
    } else if (
      entry &&
      typeof entry === 'object' &&
      isValidDateKey((entry as BlockedBookingDate).date)
    ) {
      const { date, reason } = entry as BlockedBookingDate;
      const trimmed = typeof reason === 'string' ? reason.trim() : '';
      byDate.set(date, trimmed ? { date, reason: trimmed } : { date });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Serialise a blocked-dates list for storage (omits empty reasons). */
export function serializeBlockedBookingDates(
  list: BlockedBookingDate[],
): string {
  return JSON.stringify(
    parseBlockedBookingDates(JSON.stringify(list)),
  );
}

/** Convert an instant to its YYYY-MM-DD calendar day in the business time zone. */
export function toBusinessDateKey(date: Date): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function findBlockedDate(
  dateKey: string,
  list: BlockedBookingDate[],
): BlockedBookingDate | undefined {
  return list.find((b) => b.date === dateKey);
}
