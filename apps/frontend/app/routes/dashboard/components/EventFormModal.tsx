import { useState } from 'react';
import type { TripEvent } from '../dashboard.types';
import { toDatetimeLocalInTz, tzLocalToUtc } from '../dashboard.utils';
import styles from './EventFormModal.module.css';

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

export function EventFormModal({
  itineraryId,
  activeDay,
  timezone,
  event,
  token,
  apiBase,
  onSaved,
  onClose,
}: EventFormModalProps) {
  const defaultStart = event
    ? toDatetimeLocalInTz(event.start_at, timezone)
    : `${activeDay}T09:00`;

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
        <div className={styles.dragHandleContainer}>
          <div className={styles.dragHandle} />
        </div>

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
