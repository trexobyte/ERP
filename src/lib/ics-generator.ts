/**
 * RFC 5545 iCalendar (.ics) and Google Calendar web export engine for TrexoByte ERP.
 * Handles single event exports, bulk calendar sync, and timezone preservation
 * for agency shoot sessions and client production schedules.
 */

export interface ShootCalendarEvent {
  id: string;
  title: string;
  description?: string;
  clientName?: string;
  clientColor?: string;
  scheduledDate: string | Date;
  durationMinutes?: number;
  location?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  status?: string;
  url?: string;
}

/**
 * Formats a Date object to RFC 5545 UTC timestamp format (YYYYMMDDTHHmmssZ).
 */
export function formatIcsDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Escapes characters with special meaning in iCalendar text lines according to RFC 5545.
 */
export function escapeIcsText(text?: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generates an RFC 5545 VEVENT block for a shoot session.
 */
export function generateIcsEvent(event: ShootCalendarEvent): string {
  const dtStamp = formatIcsDate(new Date());
  const startDate = new Date(event.scheduledDate);
  const durationMs = (event.durationMinutes || 180) * 60 * 1000; // default 3 hour shoot window
  const endDate = new Date(startDate.getTime() + durationMs);

  const uid = `shoot-${event.id}@trexobyte.com`;
  const summary = escapeIcsText(
    event.clientName ? `[${event.clientName}] Shoot: ${event.title}` : `Shoot: ${event.title}`
  );

  const descriptionParts = [
    `Title: ${event.title}`,
    event.clientName ? `Client: ${event.clientName}` : '',
    event.assigneeName ? `Assigned Crew: ${event.assigneeName}` : '',
    event.status ? `Status: ${event.status}` : '',
    event.description ? `\nShoot Agenda / Logistics:\n${event.description}` : '',
    '\nManaged via TrexoByte ERP • Kathmandu, Nepal',
  ].filter(Boolean);

  const description = escapeIcsText(descriptionParts.join('\n'));
  const location = escapeIcsText(event.location || 'Kathmandu, Nepal');

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
  ].join('\r\n');
}

/**
 * Generates a complete RFC 5545 VCALENDAR document containing one or more shoot sessions.
 */
export function generateIcsCalendar(
  events: ShootCalendarEvent[],
  calendarName: string = 'TrexoByte Agency Shoots'
): string {
  const eventBlocks = events.map(generateIcsEvent).join('\r\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TrexoByte ERP//Shoots Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Kathmandu',
    eventBlocks,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Generates a one-click Google Calendar web intent URL to add the shoot to Google Calendar.
 */
export function getGoogleCalendarUrl(event: ShootCalendarEvent): string {
  const startDate = new Date(event.scheduledDate);
  const durationMs = (event.durationMinutes || 180) * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);

  const title = event.clientName
    ? `[${event.clientName}] Shoot: ${event.title}`
    : `Shoot: ${event.title}`;

  const description = [
    `Shoot Session: ${event.title}`,
    event.clientName ? `Client: ${event.clientName}` : '',
    event.assigneeName ? `Assigned: ${event.assigneeName}` : '',
    event.status ? `Status: ${event.status}` : '',
    event.description ? `\nDetails:\n${event.description}` : '',
    '\nScheduled via TrexoByte ERP (Kathmandu, Nepal)',
  ]
    .filter(Boolean)
    .join('\n');

  const dates = `${formatIcsDate(startDate)}/${formatIcsDate(endDate)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates,
    details: description,
    location: event.location || 'Kathmandu, Nepal',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Triggers a client-side browser file download for a generated .ics calendar string.
 */
export function downloadIcsFile(filename: string, content: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
