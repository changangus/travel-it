import { useState, useEffect, useRef } from 'react';
import type { DayNote, Itinerary, TripEvent } from '../dashboard.types';
import { COMMON_TIMEZONES } from '../dashboard.constants';
import { getDays, formatDayLabel, eventsForDay, spanningEventsForDay, isMultiDay } from '../dashboard.utils';
import { EventCard } from './EventCard';
import { SpanningEventBanner } from './SpanningEventBanner';
import { EventFormModal } from './EventFormModal';
import { EllipsisMenu } from './EllipsisMenu';
import styles from './ItineraryView.module.css';

interface ItineraryViewProps {
  itinerary: Itinerary;
  token: string;
  apiBase: string;
  onEditTrip: () => void;
}

export function ItineraryView({ itinerary, token, apiBase, onEditTrip }: ItineraryViewProps) {
  const days = getDays(itinerary);
  const [timezone, setTimezone] = useState(itinerary.timezone || 'UTC');
  const [use24h, setUse24h] = useState(false);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const [activeDay, setActiveDay] = useState(days.includes(today) ? today : days[0]);
  const [events, setEvents] = useState<TripEvent[]>(itinerary.events);
  const [modalEvent, setModalEvent] = useState<TripEvent | null | 'new'>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [dayNotes, setDayNotes] = useState<DayNote[]>(itinerary.day_notes);
  const [dayNoteText, setDayNoteText] = useState(
    () => itinerary.day_notes.find((n) => n.date === days[0])?.content ?? ''
  );
  const dayNoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unsyncedCount = events.filter((e) => !e.is_synced).length;

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`${apiBase}/api/itineraries/${itinerary.id}/sync-to-calendar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (res.status === 422) {
        setSyncError('Please sign out and sign back in to grant calendar access.');
        return;
      }
      if (!res.ok) {
        setSyncError('Sync failed. Please try again.');
        return;
      }
      const { events: updatedEvents } = await res.json();
      setEvents(updatedEvents);
    } finally {
      setSyncing(false);
    }
  };

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
  };

  // When timezone changes, re-resolve today and switch to it if it's within the trip
  useEffect(() => {
    const todayInTz = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    if (days.includes(todayInTz)) setActiveDay(todayInTz);
  }, [timezone]);

  // Sync textarea content when switching days
  useEffect(() => {
    setDayNoteText(dayNotes.find((n) => n.date === activeDay)?.content ?? '');
  }, [activeDay]);

  const handleDayNoteChange = (content: string) => {
    setDayNoteText(content);
    if (dayNoteTimer.current) clearTimeout(dayNoteTimer.current);
    dayNoteTimer.current = setTimeout(async () => {
      const res = await fetch(`${apiBase}/api/itineraries/${itinerary.id}/day-notes`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ date: activeDay, content }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setDayNotes((prev) => {
          if (data === null) return prev.filter((n) => n.date !== activeDay);
          const exists = prev.find((n) => n.date === activeDay);
          return exists
            ? prev.map((n) => (n.date === activeDay ? data : n))
            : [...prev, data];
        });
      }
    }, 500);
  };

  const dayEvents = eventsForDay(events, activeDay, timezone).sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  const spanningEvents = spanningEventsForDay(events, activeDay, timezone).sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  );

  const handleSaved = (saved: TripEvent) => {
    setEvents((prev) => {
      const exists = prev.find((e) => e.id === saved.id);
      return exists
        ? prev.map((e) => (e.id === saved.id ? saved : e))
        : [...prev, saved];
    });
    setModalEvent(null);
  };

  const handleDeleted = (id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div>
      <div className={styles.itineraryHeader}>
        <div className={styles.itineraryTitleRow}>
          <h1 className={styles.itineraryTitle}>
            {itinerary.title}
          </h1>
          <div className={styles.itineraryActions}>
          <EllipsisMenu items={[
            {
              label: syncing ? '⏳ Syncing…' : unsyncedCount === 0 ? '📅 All synced' : `📅 Sync to Calendar (${unsyncedCount})`,
              onClick: unsyncedCount === 0 || syncing ? () => {} : handleSync,
            },
            { label: 'Edit trip', onClick: onEditTrip },
          ]} />
          </div>
        </div>
        <p className={styles.itineraryMeta}>
          {itinerary.destination} ·{' '}
          {new Date(`${itinerary.start_date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' → '}
          {new Date(`${itinerary.end_date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        {itinerary.description && (
          <p className={styles.itineraryDescription}>
            {itinerary.description}
          </p>
        )}
        {syncError && (
          <p className={styles.itineraryError}>
            {syncError}
          </p>
        )}

        <div className={styles.viewControls}>
          <div className={styles.timezoneContainer}>
            <label className={styles.timezoneLabel}>View timezone</label>
            <select
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className={styles.timezoneSelect}
            >
              {COMMON_TIMEZONES.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className={styles.timeFormatToggle}>
            <label className={styles.timezoneLabel}>Time format</label>
            <div className={styles.timeFormatBtns}>
              <button
                onClick={() => setUse24h(false)}
                className={!use24h ? styles.timeFormatBtnActive : styles.timeFormatBtn}
              >12h</button>
              <button
                onClick={() => setUse24h(true)}
                className={use24h ? styles.timeFormatBtnActive : styles.timeFormatBtn}
              >24h</button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.daySwitcher}>
        {days.map((day, i) => {
          const active = activeDay === day;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={active ? styles.dayBtnActive : styles.dayBtn}
            >
              <span className={styles.dayLabel}>Day {i + 1}</span>
              {formatDayLabel(day, timezone)}
            </button>
          );
        })}
      </div>

      <div className={styles.dayNoteSection}>
        <label className={styles.dayNoteLabel}>Day notes</label>
        <textarea
          className={styles.dayNoteTextarea}
          rows={3}
          placeholder="Write a journal entry for this day…"
          value={dayNoteText}
          onChange={(e) => handleDayNoteChange(e.target.value)}
        />
      </div>

      <div className={styles.eventsList}>
        {spanningEvents.map((event) => (
          <SpanningEventBanner
            key={event.id}
            event={event}
            day={activeDay}
            timezone={timezone}
            use24h={use24h}
            token={token}
            apiBase={apiBase}
            onEdit={() => setModalEvent(event)}
            onDeleted={handleDeleted}
          />
        ))}

        {dayEvents.length === 0 && spanningEvents.length === 0 ? (
          <p className={styles.emptyDayText}>
            Nothing planned for this day.
          </p>
        ) : (
          dayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              timezone={timezone}
              use24h={use24h}
              token={token}
              apiBase={apiBase}
              onEdit={() => setModalEvent(event)}
              onDeleted={handleDeleted}
              onSynced={handleSaved}
              isCheckin={isMultiDay(event, timezone)}
            />
          ))
        )}

        <button
          onClick={() => setModalEvent('new')}
          className={styles.addEventBtn}
          style={{ marginTop: (dayEvents.length === 0 && spanningEvents.length === 0) ? 0 : '0.25rem' }}
        >
          + Add event
        </button>
      </div>

      {modalEvent !== null && (
        <EventFormModal
          itineraryId={itinerary.id}
          activeDay={activeDay}
          timezone={timezone}
          event={modalEvent === 'new' ? null : modalEvent}
          token={token}
          apiBase={apiBase}
          onSaved={handleSaved}
          onClose={() => setModalEvent(null)}
        />
      )}
    </div>
  );
}
