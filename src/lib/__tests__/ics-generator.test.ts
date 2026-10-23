import { describe, it, expect } from 'vitest';
import {
  formatIcsDate,
  escapeIcsText,
  generateIcsEvent,
  generateIcsCalendar,
  getGoogleCalendarUrl,
  ShootCalendarEvent,
} from '@/lib/ics-generator';

describe('iCalendar (.ics) and Google Calendar Engine (PC-06)', () => {
  const sampleShoot: ShootCalendarEvent = {
    id: 'shoot-001',
    title: 'Autumn Campaign Video Shoot',
    description: 'Bring Sony FX3, 24-70mm GM II lens, Ronin RS3 Gimbal, and wireless lapels.',
    clientName: 'Sky Park Resort',
    scheduledDate: new Date('2026-10-25T10:00:00.000Z'),
    durationMinutes: 180, // 3 hours
    location: 'Hattiban, Kathmandu, Nepal',
    assigneeName: 'Aashish Sharma',
    status: 'PLANNED',
  };

  describe('formatIcsDate', () => {
    it('formats dates into RFC 5545 UTC timestamp format (YYYYMMDDTHHmmssZ)', () => {
      const date = new Date('2026-10-25T04:15:00.000Z');
      const formatted = formatIcsDate(date);
      expect(formatted).toBe('20261025T041500Z');
    });

    it('handles ISO date strings as input', () => {
      const formatted = formatIcsDate('2026-11-01T09:30:00.000Z');
      expect(formatted).toBe('20261101T093000Z');
    });
  });

  describe('escapeIcsText', () => {
    it('escapes semicolons, commas, backslashes, and newlines', () => {
      const raw = 'Item 1; Item 2, with \\ backslash\nSecond line';
      const escaped = escapeIcsText(raw);
      expect(escaped).toBe('Item 1\\; Item 2\\, with \\\\ backslash\\nSecond line');
    });

    it('returns empty string for null or undefined', () => {
      expect(escapeIcsText(undefined)).toBe('');
    });
  });

  describe('generateIcsEvent', () => {
    it('generates a valid RFC 5545 VEVENT block with required attributes', () => {
      const eventIcs = generateIcsEvent(sampleShoot);

      expect(eventIcs).toContain('BEGIN:VEVENT');
      expect(eventIcs).toContain('UID:shoot-shoot-001@trexobyte.com');
      expect(eventIcs).toContain('DTSTART:20261025T100000Z');
      expect(eventIcs).toContain('DTEND:20261025T130000Z'); // 3 hours after 10:00
      expect(eventIcs).toContain('SUMMARY:[Sky Park Resort] Shoot: Autumn Campaign Video Shoot');
      expect(eventIcs).toContain('LOCATION:Hattiban\\, Kathmandu\\, Nepal');
      expect(eventIcs).toContain('STATUS:CONFIRMED');
      expect(eventIcs).toContain('END:VEVENT');
    });

    it('includes crew attribution and logistics in event description', () => {
      const eventIcs = generateIcsEvent(sampleShoot);
      expect(eventIcs).toContain('Assigned Crew: Aashish Sharma');
      expect(eventIcs).toContain('Sony FX3');
      expect(eventIcs).toContain('TrexoByte ERP');
    });
  });

  describe('generateIcsCalendar', () => {
    it('generates a complete VCALENDAR envelope with metadata and timezone headers', () => {
      const calendarIcs = generateIcsCalendar([sampleShoot], 'Sky Park Shoots');

      expect(calendarIcs).toContain('BEGIN:VCALENDAR');
      expect(calendarIcs).toContain('VERSION:2.0');
      expect(calendarIcs).toContain('PRODID:-//TrexoByte ERP//Shoots Calendar//EN');
      expect(calendarIcs).toContain('X-WR-CALNAME:Sky Park Shoots');
      expect(calendarIcs).toContain('X-WR-TIMEZONE:Asia/Kathmandu');
      expect(calendarIcs).toContain('BEGIN:VEVENT');
      expect(calendarIcs).toContain('END:VEVENT');
      expect(calendarIcs).toContain('END:VCALENDAR');
    });

    it('supports multiple events in a single calendar export', () => {
      const secondShoot: ShootCalendarEvent = {
        id: 'shoot-002',
        title: 'Boutique Hotel Reel Shoot',
        clientName: 'Alpine Lodge',
        scheduledDate: new Date('2026-10-28T05:00:00.000Z'),
        durationMinutes: 120,
      };

      const calendarIcs = generateIcsCalendar([sampleShoot, secondShoot]);
      const vEventMatches = calendarIcs.match(/BEGIN:VEVENT/g);
      expect(vEventMatches).toHaveLength(2);
      expect(calendarIcs).toContain('UID:shoot-shoot-001@trexobyte.com');
      expect(calendarIcs).toContain('UID:shoot-shoot-002@trexobyte.com');
    });
  });

  describe('getGoogleCalendarUrl', () => {
    it('generates a valid Google Calendar web intent URL with encoded query parameters', () => {
      const url = getGoogleCalendarUrl(sampleShoot);

      expect(url).toContain('https://calendar.google.com/calendar/render?');
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('dates=20261025T100000Z%2F20261025T130000Z');
      expect(url).toContain('text=%5BSky+Park+Resort%5D+Shoot%3A+Autumn+Campaign+Video+Shoot');
      expect(url).toContain('location=Hattiban%2C+Kathmandu%2C+Nepal');
    });
  });
});
