import { type LoaderFunctionArgs, redirect, json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { useState, useRef, useEffect } from 'react';
import styles from './dashboard.module.css';
import { getSession } from '../../services/session.server';

type EventType = 'activity' | 'transport' | 'accommodation' | 'synced';

interface MediaItem {
  id: number;
  type: 'photo' | 'document';
  file_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
}

interface TripEvent {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  type: EventType;
  google_event_id: string | null;
  is_synced: boolean;
  media: MediaItem[];
}

interface Itinerary {
  id: number;
  title: string;
  description: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  timezone: string;
  events: TripEvent[];
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('token');

  if (!token) return redirect('/login');

  const res = await fetch(`${baseUrl}/api/itineraries`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) return redirect('/login');

  const { data } = await res.json();
  return json({ itineraries: data as Itinerary[], token, apiBase: baseUrl });
};

// --- Helpers ---

function formatTime(dateStr: string, tz: string) {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  });
}

function formatDayLabel(dateStr: string, tz: string) {
  // Use noon UTC so date is stable across all timezone offsets
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: tz,
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Day keys are plain "YYYY-MM-DD" strings — iterate using UTC to avoid drift.
// Slice to 10 chars first since Laravel serializes date casts as full ISO timestamps.
function getDays(itinerary: Itinerary): string[] {
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
function dateParts(dateStr: string, tz: string): string {
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
function eventsForDay(events: TripEvent[], day: string, tz: string) {
  return events.filter((e) => dateParts(e.start_at, tz) === day);
}

// Convert a UTC datetime string to the value for <input type="datetime-local">
// interpreted in the destination timezone (so the user sees/edits local trip times).
function toDatetimeLocalInTz(dateStr: string | null, tz: string): string {
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
function tzLocalToUtc(datetimeLocal: string, tz: string): string {
  // Treat the input as UTC to get a reference timestamp
  const asIfUtc = new Date(datetimeLocal + 'Z');
  // Ask what wall-clock time that UTC moment shows in the target timezone
  const wallClock = new Date(asIfUtc.toLocaleString('en-US', { timeZone: tz }));
  // The difference is the UTC offset for that timezone at that moment
  const offsetMs = asIfUtc.getTime() - wallClock.getTime();
  return new Date(asIfUtc.getTime() + offsetMs).toISOString();
}

const COMMON_TIMEZONES = [
  { label: 'New York', value: 'America/New_York' },
  { label: 'Italy (Rome)', value: 'Europe/Rome' },
];

const TYPE_STYLES: Record<EventType, { icon: string }> = {
  transport:     { icon: '🚆' },
  activity:      { icon: '📍' },
  accommodation: { icon: '🏨' },
  synced:        { icon: '📅' },
};

// --- Confirm modal ---

function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      className={styles.confirmBackdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={styles.confirmPanel}
      >
        <p className={styles.confirmMessage}>{message}</p>
        <div className={styles.confirmActions}>
          <button
            onClick={onCancel}
            className={styles.confirmCancelBtn}
          >Cancel</button>
          <button
            onClick={onConfirm}
            className={styles.confirmDeleteBtn}
          >Delete</button>
        </div>
      </div>
    </div>
  );
}

// --- Ellipsis dropdown (shared) ---

function EllipsisMenu({ items }: { items: { label: string; danger?: boolean; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={styles.ellipsisContainer}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className={styles.ellipsisBtn}
      >⋯</button>

      {open && (
        <div className={styles.ellipsisMenu}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
              className={item.danger ? styles.ellipsisMenuItemDanger : styles.ellipsisMenuItem}
            >{item.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Media components ---

function PhotoGrid({ photos, onDelete }: { photos: MediaItem[]; onDelete: (id: number) => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  return (
    <>
      <div className={styles.photoGrid}>
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={styles.photoItem}
          >
            {/* Image in its own clipping box */}
            <div
              className={styles.photoWrapper}
              onClick={() => setLightbox(photo.url)}
            >
              <img
                src={photo.url}
                alt={photo.file_name}
                className={styles.photoImg}
              />
            </div>
            {/* Menu sits on top, outside the overflow:hidden box */}
            <div
              className={styles.photoMenu}
              onClick={(e) => e.stopPropagation()}
            >
              <EllipsisMenu items={[{
                label: 'Delete',
                danger: true,
                onClick: () => setConfirmId(photo.id),
              }]} />
            </div>
          </div>
        ))}
      </div>

      {confirmId !== null && (
        <ConfirmModal
          message="Delete this photo?"
          onConfirm={() => { onDelete(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className={styles.lightboxBackdrop}
        >
          <img
            src={lightbox}
            alt=""
            className={styles.lightboxImg}
          />
        </div>
      )}
    </>
  );
}

function DocList({ docs, onDelete }: { docs: MediaItem[]; onDelete: (id: number) => void }) {
  const [confirmId, setConfirmId] = useState<number | null>(null);

  return (
    <>
    <div className={styles.docList}>
      {docs.map((doc) => (
        <div
          key={doc.id}
          className={styles.docItem}
        >
          <span className={styles.docIcon}>📄</span>
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className={styles.docLink}
          >
            {doc.file_name}
          </a>
          <span className={styles.docSize}>{formatBytes(doc.size_bytes)}</span>
          <EllipsisMenu items={[{
            label: 'Delete',
            danger: true,
            onClick: () => setConfirmId(doc.id),
          }]} />
        </div>
      ))}
    </div>

    {confirmId !== null && (
      <ConfirmModal
        message="Delete this file?"
        onConfirm={() => { onDelete(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
    )}
    </>
  );
}

// --- Upload button ---

function UploadButton({ eventId, token, apiBase, onUploaded }: {
  eventId: number;
  token: string;
  apiBase: string;
  onUploaded: (media: MediaItem) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${apiBase}/api/events/${eventId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        const { data } = await res.json();
        onUploaded(data);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        className={styles.hidden}
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={styles.uploadBtn}
      >
        {uploading ? '⏳ Uploading…' : '+ Add photo or file'}
      </button>
    </>
  );
}

// --- Event form modal ---

interface EventFormModalProps {
  itineraryId: number;
  activeDay: string;
  timezone: string;
  event: TripEvent | null;
  token: string;
  apiBase: string;
  onSaved: (event: TripEvent) => void;
  onClose: () => void;
}

function EventFormModal({ itineraryId, activeDay, timezone, event, token, apiBase, onSaved, onClose }: EventFormModalProps) {
  const defaultStart = event ? toDatetimeLocalInTz(event.start_at, timezone) : `${activeDay}T09:00`;

  const [title, setTitle] = useState(event?.title ?? '');
  const [type, setType] = useState<'activity' | 'transport' | 'accommodation'>(
    event && event.type !== 'synced' ? event.type : 'activity'
  );
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState(event ? toDatetimeLocalInTz(event.end_at, timezone) : '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      title,
      type,
      start_at: tzLocalToUtc(startAt, timezone),
      end_at: endAt ? tzLocalToUtc(endAt, timezone) : null,
      location: location || null,
      description: description || null,
    };

    const url = event
      ? `${apiBase}/api/events/${event.id}`
      : `${apiBase}/api/itineraries/${itineraryId}/events`;

    const res = await fetch(url, {
      method: event ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json?.message ?? 'Something went wrong. Please try again.');
      return;
    }

    const { data } = await res.json();
    setIsClosing(true);
    setTimeout(() => onSaved(data), 250);
  };

  return (
    <div
      onClick={handleClose}
      className={isClosing ? `${styles.formBackdrop} ${styles.backdropExit}` : `${styles.formBackdrop} ${styles.backdropEnter}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={isClosing ? `${styles.formPanel} ${styles.panelExit}` : `${styles.formPanel} ${styles.panelEnter}`}
      >
        {/* Drag handle */}
        <div className={styles.dragHandleContainer}>
          <div className={styles.dragHandle} />
        </div>

        {/* Header */}
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>
            {event ? 'Edit event' : 'New event'}
          </h2>
          <button
            onClick={handleClose}
            className={styles.closeBtn}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Train to Milan"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>Type *</label>
            <select
              required
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className={styles.select}
            >
              <option value="activity">📍 Activity</option>
              <option value="transport">🚆 Transport</option>
              <option value="accommodation">🏨 Accommodation</option>
            </select>
          </div>

          <div>
            <label className={styles.label}>Start *</label>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>End</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Milano Centrale"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes…"
              className={styles.textarea}
            />
          </div>

          {error && (
            <p className={styles.errorText}>{error}</p>
          )}

          <div className={styles.formActions}>
            <button
              type="submit"
              disabled={saving}
              className={styles.submitBtn}
            >
              {saving ? 'Saving…' : event ? 'Save changes' : 'Add event'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelBtnLarge}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Event card ---

function EventCard({ event, timezone, token, apiBase, onEdit, onDeleted, onSynced }: {
  event: TripEvent;
  timezone: string;
  token: string;
  apiBase: string;
  onEdit: () => void;
  onDeleted: (id: number) => void;
  onSynced: (event: TripEvent) => void;
}) {
  const s = TYPE_STYLES[event.type] ?? TYPE_STYLES.activity;
  const [media, setMedia] = useState<MediaItem[]>(event.media);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSyncEvent = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`${apiBase}/api/events/${event.id}/sync-to-calendar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      if (res.status === 422) {
        setSyncError('Sign out and back in to grant calendar access.');
        return;
      }
      if (!res.ok) {
        setSyncError('Sync failed. Try again.');
        return;
      }
      const { data } = await res.json();
      onSynced(data);
    } finally {
      setSyncing(false);
    }
  };

  const handleMediaDelete = async (id: number) => {
    const res = await fetch(`${apiBase}/api/media/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const handleEventDelete = async () => {
    setDeleting(true);
    const res = await fetch(`${apiBase}/api/events/${event.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onDeleted(event.id);
    } else {
      setDeleting(false);
    }
  };

  const photos = media.filter((m) => m.type === 'photo');
  const docs = media.filter((m) => m.type === 'document');

  // Determine type-specific card class
  let cardTypeClass = styles.eventCardActivity;
  if (event.type === 'transport') cardTypeClass = styles.eventCardTransport;
  if (event.type === 'accommodation') cardTypeClass = styles.eventCardAccommodation;
  if (event.type === 'synced') cardTypeClass = styles.eventCardSynced;

  // Determine type-specific tag class
  let tagTypeClass = styles.eventTypeTagActivity;
  if (event.type === 'transport') tagTypeClass = styles.eventTypeTagTransport;
  if (event.type === 'accommodation') tagTypeClass = styles.eventTypeTagAccommodation;
  if (event.type === 'synced') tagTypeClass = styles.eventTypeTagSynced;

  return (
    <>
    <div className={`${cardTypeClass} ${deleting ? styles.eventCardDeleting : ''}`}>
      {/* Header row */}
      <div className={styles.eventHeader}>
        <div className={styles.eventIcon}>{s.icon}</div>
        <div className={styles.eventContent}>
          <div className={styles.eventTitleRow}>
            <span className={styles.eventTitle}>{event.title}</span>
            <span className={tagTypeClass}>{event.type}</span>
            {event.is_synced && (
              <span className={styles.eventSyncedTag}>📅 synced</span>
            )}
          </div>
          <div className={styles.eventMeta}>
            {formatTime(event.start_at, timezone)}
            {event.end_at && ` – ${formatTime(event.end_at, timezone)}`}
            {event.location && <span className={styles.eventLocation}> · {event.location}</span>}
          </div>
          {event.description && (
            <p className={styles.eventDescription}>
              {event.description}
            </p>
          )}
        </div>

        <div className={styles.eventActions}>
          <EllipsisMenu items={[
            { label: 'Edit', onClick: onEdit },
            ...(!event.is_synced ? [{ label: syncing ? 'Syncing…' : '📅 Sync', onClick: handleSyncEvent }] : []),
            { label: 'Delete', danger: true, onClick: () => setConfirmDelete(true) },
          ]} />
        </div>
      </div>

      {/* Media */}
      <div className={styles.eventMedia}>
        {photos.length > 0 && <PhotoGrid photos={photos} onDelete={handleMediaDelete} />}
        {docs.length > 0 && <DocList docs={docs} onDelete={handleMediaDelete} />}
        <UploadButton eventId={event.id} token={token} apiBase={apiBase} onUploaded={(m) => setMedia((prev) => [...prev, m])} />
        {syncError && (
          <p className={styles.itineraryError}>{syncError}</p>
        )}
      </div>
    </div>

    {confirmDelete && (
      <ConfirmModal
        message={`Delete "${event.title}"? This cannot be undone.`}
        onConfirm={() => { setConfirmDelete(false); handleEventDelete(); }}
        onCancel={() => setConfirmDelete(false)}
      />
    )}
    </>
  );
}

// --- Empty state ---

function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyStateIcon}>✈️</div>
      <h2 className={styles.emptyStateTitle}>
        No trips yet
      </h2>
      <p className={styles.emptyStateText}>
        Your itineraries will appear here once you add your first trip.
      </p>
    </div>
  );
}

// --- Itinerary view ---

function ItineraryView({ itinerary, token, apiBase }: { itinerary: Itinerary; token: string; apiBase: string }) {
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

        {/* Timezone selector */}
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

      {/* Day switcher */}
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

      {/* Events */}
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

        {/* Add event button */}
        <button
          onClick={() => setModalEvent('new')}
          className={styles.addEventBtn}
          style={{ marginTop: dayEvents.length === 0 ? 0 : '0.25rem' }}
        >
          + Add event
        </button>
      </div>

      {/* Modal */}
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

// --- Page ---

export default function Dashboard() {
  const { itineraries, token, apiBase } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.logo}>travel-it</span>
          <Link to="/" className={styles.homeLink}>← Home</Link>
        </div>
      </header>

      <main className={styles.main}>
        {itineraries.length === 0 ? (
          <EmptyState />
        ) : (
          <ItineraryView itinerary={itineraries[0]} token={token} apiBase={apiBase} />
        )}
      </main>
    </div>
  );
}
