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

const TYPE_STYLES: Record<EventType, { icon: string; accent: string; bg: string }> = {
  transport:     { icon: '🚆', accent: '#3b82f6', bg: '#eff6ff' },
  activity:      { icon: '📍', accent: '#f59e0b', bg: '#fffbeb' },
  accommodation: { icon: '🏨', accent: '#10b981', bg: '#ecfdf5' },
  synced:        { icon: '📅', accent: '#8b5cf6', bg: '#f5f3ff' },
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
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '12px', padding: '1.5rem',
          width: '100%', maxWidth: '360px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: '#111', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.45rem 1rem', borderRadius: '6px',
              border: '1px solid #d1d5db', background: '#fff',
              color: '#374151', fontSize: '0.875rem', fontFamily: 'inherit', cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.45rem 1rem', borderRadius: '6px',
              border: 'none', background: '#ef4444',
              color: '#fff', fontSize: '0.875rem', fontFamily: 'inherit',
              cursor: 'pointer', fontWeight: 600,
            }}
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{
          background: 'none', border: 'none', borderRadius: '4px',
          padding: '0.15rem 0.35rem', cursor: 'pointer',
          fontSize: '1rem', color: '#9ca3af', lineHeight: 1, fontFamily: 'inherit',
        }}
      >⋯</button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          minWidth: '110px', zIndex: 100, overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.5rem 0.85rem', background: 'none', border: 'none',
                fontSize: '0.85rem', color: item.danger ? '#ef4444' : '#374151',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = item.danger ? '#fef2f2' : '#f9fafb')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
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
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        {photos.map((photo) => (
          <div
            key={photo.id}
            style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', flexShrink: 0 }}
          >
            {/* Image in its own clipping box */}
            <div
              style={{ width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => setLightbox(photo.url)}
            >
              <img
                src={photo.url}
                alt={photo.file_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
            {/* Menu sits on top, outside the overflow:hidden box */}
            <div
              style={{ position: 'absolute', top: '3px', right: '3px' }}
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
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={lightbox}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
      {docs.map((doc) => (
        <div
          key={doc.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: '#f3f4f6', borderRadius: '6px', padding: '0.35rem 0.6rem',
          }}
        >
          <span style={{ fontSize: '1rem' }}>📄</span>
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: '0.8rem', color: '#374151', flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {doc.file_name}
          </a>
          <span style={{ fontSize: '0.75rem', color: '#9ca3af', flexShrink: 0 }}>{formatBytes(doc.size_bytes)}</span>
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
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          marginTop: '0.75rem',
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.3rem 0.75rem',
          borderRadius: '6px',
          border: '1px dashed #d1d5db',
          background: 'transparent',
          color: '#6b7280',
          fontSize: '0.8rem',
          cursor: uploading ? 'default' : 'pointer',
          opacity: uploading ? 0.6 : 1,
          fontFamily: 'inherit',
        }}
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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    fontSize: '1rem', // ≥16px prevents iOS auto-zoom on focus
    fontFamily: 'inherit',
    background: '#fff',
    color: '#111',
    boxSizing: 'border-box',
    appearance: 'none',
    WebkitAppearance: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  };

  return (
    <div
      onClick={handleClose}
      className={isClosing ? styles.backdropExit : styles.backdropEnter}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={isClosing ? styles.panelExit : styles.panelEnter}
        style={{
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: '0 1.25rem 1.5rem',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92dvh',
          overflowY: 'auto',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.18)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.25rem' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: '#e5e7eb' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0 1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#111' }}>
            {event ? 'Edit event' : 'New event'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: '#f3f4f6', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', cursor: 'pointer',
              fontSize: '1rem', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Train to Milan"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Type *</label>
            <select
              required
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              style={{ ...inputStyle, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%236b7280\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.85rem center', paddingRight: '2.5rem' }}
            >
              <option value="activity">📍 Activity</option>
              <option value="transport">🚆 Transport</option>
              <option value="accommodation">🏨 Accommodation</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Start *</label>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>End</label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Milano Centrale"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes…"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#ef4444' }}>{error}</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '12px',
                border: 'none', background: saving ? '#a5b4fc' : '#6366f1',
                color: '#fff', fontSize: '1rem', fontFamily: 'inherit',
                cursor: saving ? 'default' : 'pointer', fontWeight: 600,
              }}
            >
              {saving ? 'Saving…' : event ? 'Save changes' : 'Add event'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '12px',
                border: '1px solid #e5e7eb', background: '#fff',
                color: '#374151', fontSize: '1rem', fontFamily: 'inherit', cursor: 'pointer',
              }}
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

  return (
    <>
    <div style={{
      padding: '1rem',
      borderRadius: '10px',
      border: `1px solid ${s.accent}33`,
      background: s.bg,
      opacity: deleting ? 0.5 : 1,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ fontSize: '1.4rem', lineHeight: 1, paddingTop: '2px', flexShrink: 0 }}>{s.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: '#111' }}>{event.title}</span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 500, color: s.accent,
              background: `${s.accent}1a`, borderRadius: '99px', padding: '1px 8px', textTransform: 'capitalize',
            }}>{event.type}</span>
            {event.is_synced && (
              <span style={{
                fontSize: '0.7rem', fontWeight: 500, color: '#34a853',
                background: '#e6f4ea', borderRadius: '99px', padding: '1px 8px',
              }}>📅 synced</span>
            )}
          </div>
          <div style={{ marginTop: '2px', fontSize: '0.85rem', color: '#6b7280' }}>
            {formatTime(event.start_at, timezone)}
            {event.end_at && ` – ${formatTime(event.end_at, timezone)}`}
            {event.location && <span style={{ color: '#9ca3af' }}> · {event.location}</span>}
          </div>
          {event.description && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.5, margin: '0.5rem 0 0' }}>
              {event.description}
            </p>
          )}
        </div>

        <div style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
          <EllipsisMenu items={[
            { label: 'Edit', onClick: onEdit },
            ...(!event.is_synced ? [{ label: syncing ? 'Syncing…' : '📅 Sync', onClick: handleSyncEvent }] : []),
            { label: 'Delete', danger: true, onClick: () => setConfirmDelete(true) },
          ]} />
        </div>
      </div>

      {/* Media */}
      <div style={{ marginTop: photos.length || docs.length ? '0.5rem' : 0, paddingLeft: '2.4rem' }}>
        {photos.length > 0 && <PhotoGrid photos={photos} onDelete={handleMediaDelete} />}
        {docs.length > 0 && <DocList docs={docs} onDelete={handleMediaDelete} />}
        <UploadButton eventId={event.id} token={token} apiBase={apiBase} onUploaded={(m) => setMedia((prev) => [...prev, m])} />
        {syncError && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#ef4444' }}>{syncError}</p>
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
    <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✈️</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
        No trips yet
      </h2>
      <p style={{ color: '#6b7280', maxWidth: '320px', margin: '0 auto' }}>
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
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            {itinerary.title}
          </h1>
          <button
            onClick={handleSync}
            disabled={syncing || unsyncedCount === 0}
            title={unsyncedCount === 0 ? 'All events synced' : `Sync ${unsyncedCount} event${unsyncedCount !== 1 ? 's' : ''} to Google Calendar`}
            style={{
              flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: unsyncedCount === 0 ? '#d1d5db' : '#34a853',
              background: unsyncedCount === 0 ? '#f9fafb' : '#fff',
              color: unsyncedCount === 0 ? '#9ca3af' : '#34a853',
              fontSize: '0.8rem', fontWeight: 600, fontFamily: 'inherit',
              cursor: syncing || unsyncedCount === 0 ? 'default' : 'pointer',
              opacity: syncing ? 0.7 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {syncing ? '⏳ Syncing…' : unsyncedCount === 0 ? '📅 Synced' : '📅 Sync to Calendar'}
          </button>
        </div>
        <p style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: '#6b7280' }}>
          {itinerary.destination} ·{' '}
          {new Date(`${itinerary.start_date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' → '}
          {new Date(`${itinerary.end_date.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        {itinerary.description && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#4b5563' }}>
            {itinerary.description}
          </p>
        )}
        {syncError && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#ef4444', margin: '0.5rem 0 0' }}>
            {syncError}
          </p>
        )}

        {/* Timezone selector */}
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', flexShrink: 0 }}>🌍 Timezone:</span>
          <select
            value={timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            disabled={tzSaving}
            style={{
              fontSize: '0.8rem', fontFamily: 'inherit', color: '#374151',
              border: '1px solid #d1d5db', borderRadius: '6px',
              padding: '0.2rem 0.5rem', background: '#fff', cursor: 'pointer',
              opacity: tzSaving ? 0.6 : 1,
            }}
          >
            {COMMON_TIMEZONES.map(({ label, value }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Day switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '4px' }}>
        {days.map((day, i) => {
          const active = activeDay === day;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              style={{
                flexShrink: 0, padding: '0.4rem 1rem', borderRadius: '8px',
                border: `1px solid ${active ? '#6366f1' : '#e5e7eb'}`,
                background: active ? '#6366f1' : '#fff',
                color: active ? '#fff' : '#374151',
                fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 500,
                cursor: 'pointer', textAlign: 'center', lineHeight: 1.4,
              }}
            >
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.8 }}>Day {i + 1}</span>
              {formatDayLabel(day, timezone)}
            </button>
          );
        })}
      </div>

      {/* Events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {dayEvents.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem 0', margin: 0 }}>
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
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            padding: '0.65rem',
            borderRadius: '10px',
            border: '1.5px dashed #d1d5db',
            background: 'transparent',
            color: '#6b7280',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
            marginTop: dayEvents.length === 0 ? 0 : '0.25rem',
          }}
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
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>travel-it</span>
          <Link to="/" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>← Home</Link>
        </div>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {itineraries.length === 0 ? (
          <EmptyState />
        ) : (
          <ItineraryView itinerary={itineraries[0]} token={token} apiBase={apiBase} />
        )}
      </main>
    </div>
  );
}
