import { describe, it, expect } from 'vitest';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  subDays,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  format,
  isSameMonth,
} from 'date-fns';
import { toLocalDateKey, parseLocalDateKey } from '@/lib/date-utils';

describe('Calendar Views & Navigation Logic', () => {
  const baseDate = parseLocalDateKey('2026-10-25'); // Sunday Oct 25, 2026

  describe('Month View calculations', () => {
    it('generates the exact days for the month grid without shifting local dates', () => {
      const monthStart = parseLocalDateKey('2026-10-01');
      const monthEnd = parseLocalDateKey('2026-10-31');
      const startGrid = startOfWeek(monthStart, { weekStartsOn: 0 });
      const endGrid = endOfWeek(monthEnd, { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start: startGrid, end: endGrid });

      expect(days.length).toBeGreaterThanOrEqual(28);
      expect(days.length % 7).toBe(0);
      expect(toLocalDateKey(startGrid)).toBe('2026-09-27');
      expect(toLocalDateKey(endGrid)).toBe('2026-10-31');
    });

    it('navigates to previous and next month correctly', () => {
      const prev = subMonths(baseDate, 1);
      const next = addMonths(baseDate, 1);

      expect(toLocalDateKey(prev)).toBe('2026-09-25');
      expect(toLocalDateKey(next)).toBe('2026-11-25');
    });
  });

  describe('Week View calculations', () => {
    it('generates 7 consecutive days starting on Sunday', () => {
      const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(baseDate, { weekStartsOn: 0 });
      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

      expect(daysInWeek.length).toBe(7);
      expect(toLocalDateKey(daysInWeek[0])).toBe('2026-10-25');
      expect(toLocalDateKey(daysInWeek[6])).toBe('2026-10-31');
    });

    it('navigates previous and next week correctly', () => {
      const prevWeek = subWeeks(baseDate, 1);
      const nextWeek = addWeeks(baseDate, 1);

      expect(toLocalDateKey(prevWeek)).toBe('2026-10-18');
      expect(toLocalDateKey(nextWeek)).toBe('2026-11-01');
    });
  });

  describe('Three-Day View calculations', () => {
    it('generates exactly 3 consecutive days starting from currentDate', () => {
      const day1 = baseDate;
      const day2 = addDays(baseDate, 1);
      const day3 = addDays(baseDate, 2);

      const days = [day1, day2, day3];
      expect(days.length).toBe(3);
      expect(toLocalDateKey(day1)).toBe('2026-10-25');
      expect(toLocalDateKey(day2)).toBe('2026-10-26');
      expect(toLocalDateKey(day3)).toBe('2026-10-27');
    });

    it('navigates by 3 days correctly', () => {
      const prev3 = subDays(baseDate, 3);
      const next3 = addDays(baseDate, 3);

      expect(toLocalDateKey(prev3)).toBe('2026-10-22');
      expect(toLocalDateKey(next3)).toBe('2026-10-28');
    });
  });

  describe('Date label formatting across views', () => {
    it('formats month view title', () => {
      expect(format(baseDate, 'MMMM yyyy')).toBe('October 2026');
    });

    it('formats week view title', () => {
      const wStart = startOfWeek(baseDate, { weekStartsOn: 0 });
      const wEnd = endOfWeek(baseDate, { weekStartsOn: 0 });
      const label = isSameMonth(wStart, wEnd)
        ? `${format(wStart, 'MMM d')} – ${format(wEnd, 'd, yyyy')}`
        : `${format(wStart, 'MMM d')} – ${format(wEnd, 'MMM d, yyyy')}`;

      expect(label).toBe('Oct 25 – 31, 2026');
    });

    it('formats 3-day view title', () => {
      const d3End = addDays(baseDate, 2);
      const label = isSameMonth(baseDate, d3End)
        ? `${format(baseDate, 'MMM d')} – ${format(d3End, 'd, yyyy')}`
        : `${format(baseDate, 'MMM d')} – ${format(d3End, 'MMM d, yyyy')}`;

      expect(label).toBe('Oct 25 – 27, 2026');
    });
  });
});
