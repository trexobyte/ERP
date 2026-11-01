import { describe, it, expect } from 'vitest';
import { getNepaliDate, getNepaliMonthSpan, toNepaliDigits } from '../nepali-date';

describe('Nepali Bikram Sambat Date Utilities', () => {
  it('converts Gregorian date to Bikram Sambat date info accurately', () => {
    // 2026-11-01 is Kartik 15, 2083 BS
    const bs = getNepaliDate('2026-11-01');
    expect(bs).not.toBeNull();
    expect(bs?.year).toBe(2083);
    expect(bs?.monthIndex).toBe(6); // Kartik
    expect(bs?.monthName).toBe('Kartik');
    expect(bs?.day).toBe(15);
    expect(bs?.formattedBS).toBe('Kartik 15, 2083 BS');
    expect(bs?.dayNp).toBe('१५');
    expect(bs?.yearNp).toBe('२०८३');
  });

  it('handles Date objects as well as YYYY-MM-DD strings', () => {
    const d = new Date(2026, 10, 1, 12, 0, 0); // Nov 1, 2026
    const bs = getNepaliDate(d);
    expect(bs).not.toBeNull();
    expect(bs?.year).toBe(2083);
    expect(bs?.monthName).toBe('Kartik');
    expect(bs?.day).toBe(15);
  });

  it('returns null gracefully for invalid or empty inputs without throwing', () => {
    expect(getNepaliDate(null)).toBeNull();
    expect(getNepaliDate(undefined)).toBeNull();
    expect(getNepaliDate('')).toBeNull();
    expect(getNepaliDate('invalid-date')).toBeNull();
  });

  it('converts digits to Nepali script correctly', () => {
    expect(toNepaliDigits(0)).toBe('०');
    expect(toNepaliDigits(123456789)).toBe('१२३४५६७८९');
    expect(toNepaliDigits('2083')).toBe('२०८३');
  });

  it('generates accurate month span labels for calendar headers', () => {
    // Nov 1 to Nov 30, 2026 spans Kartik to Mangsir 2083 BS
    const span = getNepaliMonthSpan('2026-11-01', '2026-11-30');
    expect(span).toBe('Kartik – Mangsir 2083 BS');
  });
});
