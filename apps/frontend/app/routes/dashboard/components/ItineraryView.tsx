import { useState } from 'react';
import type { Itinerary, TripEvent } from '../dashboard.types';
import { COMMON_TIMEZONES } from '../dashboard.constants';
import { getDays, formatDayLabel, eventsForDay } from '../dashboard.utils';
import { EventCard } from './EventCard';
import { EventFormModal } from './EventFormModal';
import styles from './ItineraryView.module.css';

interface ItineraryViewProps {
  itinerary: Itinerary;
  token: string;
  apiBase: string;
}

export function ItineraryView({ itinerary, token, apiBase }: ItineraryViewProps) {
  const days = getDays(itinerary);
  const [activeDay, setActiveDay] = useState(days[0]);
  const [events, setEvents] = useState<TripEvent[]>(itinerary.events);
  const [modalEvent, setModalEvent] = useState<TripEvent | null | 'new'>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(itinerary.timezone || 'UTC');
  const [tzSaving, setTzSaving] = useState(false);

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

  const handleTimezoneChange = async (tz: string) => {
    setTimezone(tz);
    setTzSaving(true);
    await fetch(`${apiBase}/api/itineraries/${itinerary.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ timezone: tz }),
    });
    setTzSaving(false);
  };

  const dayEvents = eventsForDay(events, activeDay, timezone).sort(
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
          <button
            onClick={handleSync}
            disabled={syncing || unsyncedCount === 0}
            title={unsyncedCount === 0 ? 'All events synced' : `Sync ${unsyncedCount} event${unsyncedCount !== 1 ? 's' : ''} to Google Calendar`}
            className={unsyncedCount === 0 ? styles.syncBtnSynced : styles.syncBtn}
            style={{ opacity: syncing ? 0.7 : 1 }}
          >
            {syncing ? '⏳ Syncing…' : unsyncedCount === 0 ? '📅 Synced' : '📅 Sync to Calendar'}
          </button>
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

        <div className={styles.timezoneContainer}>
          <span className={styles.timezoneLabel}>🌍 Timezone:</span>
          <select
            value={timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            disabled={tzSaving}
            className={styles.timezoneSelect}
          >
            {COMMON_TIMEZONES.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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

      <div className={styles.eventsList}>
        {dayEvents.length === 0 ? (
          <p className={styles.emptyDayText}>
            Nothing planned for this day.
          </p>
        ) : (
          dayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              timezone={timezone}
              token={token}
              apiBase={apiBase}
              onEdit={() => setModalEvent(event)}
              onDeleted={handleDeleted}
              onSynced={handleSaved}
            />
          ))
        )}

        <button
          onClick={() => setModalEvent('new')}
          className={styles.addEventBtn}
          style={{ marginTop: dayEvents.length === 0 ? 0 : '0.25rem' }}
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
