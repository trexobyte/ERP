/**
 * TrexoERP Nepali Bikram Sambat (BS) Date Utilities
 * Robust, timezone-safe helpers for Bikram Sambat calendar display.
 */

import NepaliDate from 'nepali-date-converter';
import { parseLocalDateKey, toLocalDateKey } from './date-utils';

export interface NepaliDateInfo {
  year: number;
  month: number; // 1-12
  monthIndex: number; // 0-11
  day: number; // 1-32
  monthName: string; // e.g. "Kartik"
  monthNameNp: string; // e.g. "कार्तिक"
  dayNp: string; // e.g. "१५"
  yearNp: string; // e.g. "२०८३"
  formatted: string; // e.g. "Kartik 15, 2083"
  formattedBS: string; // e.g. "Kartik 15, 2083 BS"
  formattedNp: string; // e.g. "कार्तिक १५, २०८३"
  shortDate: string; // e.g. "Kartik 15"
}

const NEPALI_MONTH_NAMES_EN = [
  'Baisakh',
  'Jestha',
  'Asar',
  'Shrawan',
  'Bhadra',
  'Aswin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

const NEPALI_MONTH_NAMES_NP = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कार्तिक',
  'मंसिर',
  'पुष',
  'माघ',
  'फागुन',
  'चैत',
];

const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toNepaliDigits(num: number | string): string {
  return String(num)
    .split('')
    .map((ch) => {
      const n = parseInt(ch, 10);
      return !isNaN(n) && n >= 0 && n <= 9 ? NEPALI_DIGITS[n] : ch;
    })
    .join('');
}

/**
 * Converts a Gregorian Date or date key ('YYYY-MM-DD') to Nepali Bikram Sambat date info.
 * Never throws — returns null if conversion fails or date is out of range.
 */
export function getNepaliDate(date: Date | string | null | undefined): NepaliDateInfo | null {
  if (!date) return null;

  try {
    let jsDate: Date;
    if (typeof date === 'string') {
      const key = toLocalDateKey(date);
      if (!key) return null;
      jsDate = parseLocalDateKey(key);
    } else if (date instanceof Date) {
      if (isNaN(date.getTime())) return null;
      const key = toLocalDateKey(date);
      jsDate = parseLocalDateKey(key);
    } else {
      return null;
    }

    const nepali = new NepaliDate(jsDate);
    const year = nepali.getYear();
    const monthIndex = nepali.getMonth(); // 0-11
    const day = nepali.getDate();

    if (isNaN(year) || isNaN(monthIndex) || isNaN(day)) {
      return null;
    }

    const month = monthIndex + 1;
    const monthName = NEPALI_MONTH_NAMES_EN[monthIndex] || nepali.format('MMMM', 'en');
    const monthNameNp = NEPALI_MONTH_NAMES_NP[monthIndex] || nepali.format('MMMM', 'np');
    const dayNp = toNepaliDigits(day);
    const yearNp = toNepaliDigits(year);

    return {
      year,
      month,
      monthIndex,
      day,
      monthName,
      monthNameNp,
      dayNp,
      yearNp,
      formatted: `${monthName} ${day}, ${year}`,
      formattedBS: `${monthName} ${day}, ${year} BS`,
      formattedNp: `${monthNameNp} ${dayNp}, ${yearNp}`,
      shortDate: `${monthName} ${day}`,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Returns a concise BS month span label for a given date interval (e.g. for Month View headers).
 * Examples:
 * - "Kartik – Mangsir 2083 BS"
 * - "Kartik 2083 BS"
 * - "Chaitra 2082 – Baisakh 2083 BS"
 */
export function getNepaliMonthSpan(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): string {
  const startBs = getNepaliDate(startDate);
  const endBs = getNepaliDate(endDate);

  if (!startBs && !endBs) return '';
  if (startBs && !endBs) return startBs.formattedBS;
  if (!startBs && endBs) return endBs.formattedBS;

  if (startBs && endBs) {
    if (startBs.year === endBs.year) {
      if (startBs.monthIndex === endBs.monthIndex) {
        return `${startBs.monthName} ${startBs.year} BS`;
      }
      return `${startBs.monthName} – ${endBs.monthName} ${startBs.year} BS`;
    }
    return `${startBs.monthName} ${startBs.year} – ${endBs.monthName} ${endBs.year} BS`;
  }

  return '';
}
