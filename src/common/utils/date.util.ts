import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Returns start (inclusive) and end (exclusive) Date objects for a given
 * year-month in the specified IANA timezone.
 */
export function getMonthBounds(
  year: number,
  month: number,
  tz: string,
): { from: Date; to: Date } {
  const from = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, tz).startOf('month').toDate();
  const to = dayjs.tz(`${year}-${String(month).padStart(2, '0')}-01`, tz).endOf('month').toDate();
  return { from, to };
}

/**
 * Returns bounds for today.
 */
export function getDayBounds(tz: string): { from: Date; to: Date } {
  const from = dayjs().tz(tz).startOf('day').toDate();
  const to = dayjs().tz(tz).endOf('day').toDate();
  return { from, to };
}

/**
 * Returns bounds for yesterday.
 */
export function getYesterdayBounds(tz: string): { from: Date; to: Date } {
  const from = dayjs().tz(tz).subtract(1, 'day').startOf('day').toDate();
  const to = dayjs().tz(tz).subtract(1, 'day').endOf('day').toDate();
  return { from, to };
}

/**
 * Returns bounds for this week (starting Monday).
 */
export function getWeekBounds(tz: string): { from: Date; to: Date } {
  // Dayjs default is usually Sunday for startOf('week'). To force Monday:
  const now = dayjs().tz(tz);
  const day = now.day();
  const diff = day === 0 ? 6 : day - 1; // 0 is Sunday
  const from = now.subtract(diff, 'day').startOf('day').toDate();
  const to = dayjs(from).add(6, 'day').endOf('day').toDate();
  return { from, to };
}

/**
 * Returns the current year and month in the given timezone.
 */
export function currentYearMonth(tz: string): { year: number; month: number } {
  const now = dayjs().tz(tz);
  return { year: now.year(), month: now.month() + 1 };
}

/**
 * Formats a Date as "MMMM YYYY" in the given locale.
 * Example: { year: 2026, month: 3, lang: 'ru' } → "март 2026"
 */
export function formatMonthLabel(
  year: number,
  month: number,
  lang: string,
): string {
  const localeMap: Record<string, string> = {
    uz: 'uz-UZ',
    ru: 'ru-RU',
    en: 'en-US',
  };
  const locale = localeMap[lang] ?? 'uz-UZ';
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString(locale, { month: 'long', year: 'numeric' });
}

/**
 * Formats a Date to a readable string (DD.MM.YYYY HH:mm) in a timezone.
 */
export function formatDateTime(date: Date, tz: string): string {
  return dayjs(date).tz(tz).format('DD.MM.YYYY HH:mm');
}

/**
 * Validates an IANA timezone string.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
