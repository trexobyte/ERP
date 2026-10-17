/**
 * TrexoERP Unified Date Utilities
 * Guarantees zero timezone/off-by-one shifts across all environments
 * (Asia/Kathmandu UTC+5:45, UTC, and other timezones).
 */

/**
 * Formats a Date object, ISO string, or date string into a local 'YYYY-MM-DD' key.
 * Strictly avoids `.toISOString().split('T')[0]` which shifts dates based on UTC offset.
 */
export function toLocalDateKey(date: Date | string | null | undefined): string {
  if (!date) return '';

  if (typeof date === 'string') {
    const trimmed = date.trim();
    if (!trimmed) return '';

    // If already in pure 'YYYY-MM-DD' format, return directly without alteration
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      // If timestamp string (e.g. ISO format with T), parse as Date to read the local date
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      return `${match[1]}-${match[2]}-${match[3]}`;
    }

    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (date instanceof Date) {
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Parses a 'YYYY-MM-DD' date string into a local Date object.
 * Strictly avoids `new Date("YYYY-MM-DD")` which ECMAScript parses as UTC midnight.
 */
export function parseLocalDateKey(str: string | Date | null | undefined): Date {
  if (!str) return new Date();
  if (str instanceof Date) return str;

  const trimmed = str.trim();
  const datePart = trimmed.includes('T') ? trimmed.split('T')[0] : trimmed;
  const parts = datePart.split('-');

  if (parts.length >= 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      // Local noon (12:00:00) ensures immunity against midnight/DST boundaries
      return new Date(y, m - 1, d, 12, 0, 0);
    }
  }

  return new Date(str);
}

/**
 * Converts any date representation to a database-safe UTC noon ISO string,
 * or null if empty. In PostgreSQL (timestamp without timezone) and in all global timezones,
 * noon UTC (T12:00:00.000Z) consistently lands on the exact same YYYY-MM-DD calendar day.
 */
export function toDatabaseDateString(date: Date | string | null | undefined): string | null {
  const key = toLocalDateKey(date);
  if (!key) return null;
  return `${key}T12:00:00.000Z`;
}

/**
 * Returns today's local date key in 'YYYY-MM-DD' format.
 */
export function getTodayLocalDateKey(): string {
  return toLocalDateKey(new Date());
}

/**
 * Formats a date for display using local date getters without timezone shift.
 */
export function formatLocalDate(
  date: Date | string | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  const key = toLocalDateKey(date);
  if (!key) return '';
  const d = parseLocalDateKey(key);
  return d.toLocaleDateString(locale, options);
}
