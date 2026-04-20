import type { Itinerary, TripEvent } from './dashboard.types';

export function formatTime(dateStr: string, tz: string) {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  });
}

export function formatDayLabel(dateStr: string, tz: string) {
  // Use noon UTC so date is stable across all timezone offsets
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: tz,
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Day keys are plain "YYYY-MM-DD" strings — iterate using UTC to avoid drift.
// Slice to 10 chars first since Laravel serializes date casts as full ISO timestamps.
export function getDays(itinerary: Itinerary): string[] {
  const days: string[] = [];
  const cur = new Date(`${itinerary.start_date.slice(0, 10)}T12:00:00Z`);
  const end = new Date(`${itinerary.end_date.slice(0, 10)}T12:00:00Z`);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

// Extract "YYYY-MM-DD" for a UTC timestamp in a given timezone using formatToParts
// so the result is never affected by locale-specific date ordering or separators.
export function dateParts(dateStr: string, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(dateStr));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Group events by their calendar date in the destination timezone
export function eventsForDay(events: TripEvent[], day: string, tz: string) {
  return events.filter((e) => dateParts(e.start_at, tz) === day);
}

// Convert a UTC datetime string to the value for <input type="datetime-local">
// interpreted in the destination timezone (so the user sees/edits local trip times).
export function toDatetimeLocalInTz(dateStr: string | null, tz: string): string {
  if (!dateStr) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(dateStr));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

// Convert a datetime-local string (wall-clock time in `tz`) to a UTC ISO string.
export function tzLocalToUtc(datetimeLocal: string, tz: string): string {
  // Treat the input as UTC to get a reference timestamp
  const asIfUtc = new Date(datetimeLocal + 'Z');
  // Ask what wall-clock time that UTC moment shows in the target timezone
  const wallClock = new Date(asIfUtc.toLocaleString('en-US', { timeZone: tz }));
  // The difference is the UTC offset for that timezone at that moment
  const offsetMs = asIfUtc.getTime() - wallClock.getTime();
  return new Date(asIfUtc.getTime() + offsetMs).toISOString();
}
