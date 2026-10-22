import { describe, it, expect } from 'vitest';
import {
  toLocalDateKey,
  parseLocalDateKey,
  toDatabaseDateString,
  getTodayLocalDateKey,
  formatLocalDate,
} from '@/lib/date-utils';

describe('TrexoERP Date Utilities (Asia/Kathmandu Zero-Shift Invariant)', () => {
  describe('toLocalDateKey', () => {
    it('returns empty string for null, undefined, or empty string', () => {
      expect(toLocalDateKey(null)).toBe('');
      expect(toLocalDateKey(undefined)).toBe('');
      expect(toLocalDateKey('')).toBe('');
      expect(toLocalDateKey('   ')).toBe('');
    });

    it('returns pure YYYY-MM-DD string as-is without shift', () => {
      expect(toLocalDateKey('2026-10-22')).toBe('2026-10-22');
      expect(toLocalDateKey('2026-01-01')).toBe('2026-01-01');
      expect(toLocalDateKey('2026-12-31')).toBe('2026-12-31');
    });

    it('extracts YYYY-MM-DD from ISO timestamp strings', () => {
      const isoStr = '2026-05-15T12:00:00.000Z';
      const key = toLocalDateKey(isoStr);
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formats native Date object to local YYYY-MM-DD key', () => {
      const d = new Date(2026, 9, 22); // Month is 0-indexed: 9 = October
      expect(toLocalDateKey(d)).toBe('2026-10-22');
    });

    it('handles leap year date correctly', () => {
      const leapDate = new Date(2024, 1, 29); // Feb 29, 2024
      expect(toLocalDateKey(leapDate)).toBe('2024-02-29');
    });
  });

  describe('parseLocalDateKey', () => {
    it('parses YYYY-MM-DD into a Date set to local noon (12:00:00)', () => {
      const parsed = parseLocalDateKey('2026-10-22');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(9); // October
      expect(parsed.getDate()).toBe(22);
      expect(parsed.getHours()).toBe(12);
      expect(parsed.getMinutes()).toBe(0);
      expect(parsed.getSeconds()).toBe(0);
    });

    it('handles Date instances passed into parseLocalDateKey', () => {
      const original = new Date(2026, 3, 10);
      const parsed = parseLocalDateKey(original);
      expect(parsed).toBe(original);
    });

    it('handles null/undefined gracefully by returning a Date', () => {
      const parsed = parseLocalDateKey(null);
      expect(parsed).toBeInstanceOf(Date);
      expect(!isNaN(parsed.getTime())).toBe(true);
    });
  });

  describe('toDatabaseDateString', () => {
    it('returns UTC noon ISO string for valid date string', () => {
      expect(toDatabaseDateString('2026-10-22')).toBe('2026-10-22T12:00:00.000Z');
      expect(toDatabaseDateString('2026-01-05')).toBe('2026-01-05T12:00:00.000Z');
    });

    it('returns null for null, undefined, or invalid inputs', () => {
      expect(toDatabaseDateString(null)).toBeNull();
      expect(toDatabaseDateString(undefined)).toBeNull();
      expect(toDatabaseDateString('')).toBeNull();
    });

    it('converts Date object to UTC noon ISO string', () => {
      const d = new Date(2026, 7, 18); // August 18, 2026
      expect(toDatabaseDateString(d)).toBe('2026-08-18T12:00:00.000Z');
    });
  });

  describe('getTodayLocalDateKey', () => {
    it('returns YYYY-MM-DD matching current day', () => {
      const today = getTodayLocalDateKey();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const now = new Date();
      const expectedYear = String(now.getFullYear());
      expect(today.startsWith(expectedYear)).toBe(true);
    });
  });

  describe('formatLocalDate', () => {
    it('formats a date string correctly', () => {
      const formatted = formatLocalDate('2026-10-22', 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      expect(formatted).toBe('Oct 22, 2026');
    });

    it('returns empty string for null or empty input', () => {
      expect(formatLocalDate(null)).toBe('');
      expect(formatLocalDate('')).toBe('');
    });
  });
});
