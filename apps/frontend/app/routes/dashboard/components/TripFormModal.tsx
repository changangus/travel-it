import { useState } from 'react';
import type { Itinerary } from '../dashboard.types';
import { COMMON_TIMEZONES } from '../dashboard.constants';
import styles from './EventFormModal.module.css';

interface TripFormModalProps {
  itinerary?: Itinerary;
  token: string;
  apiBase: string;
  onSaved: (itinerary: Itinerary) => void;
  onClose: () => void;
}

export function TripFormModal({ itinerary, token, apiBase, onSaved, onClose }: TripFormModalProps) {
  const [title, setTitle] = useState(itinerary?.title ?? '');
  const [destination, setDestination] = useState(itinerary?.destination ?? '');
  const [description, setDescription] = useState(itinerary?.description ?? '');
  const [startDate, setStartDate] = useState(itinerary?.start_date.slice(0, 10) ?? '');
  const [endDate, setEndDate] = useState(itinerary?.end_date.slice(0, 10) ?? '');
  const [timezone, setTimezone] = useState(itinerary?.timezone ?? 'UTC');
  const [saving, setSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!itinerary;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = isEditing
      ? `${apiBase}/api/itineraries/${itinerary.id}`
      : `${apiBase}/api/itineraries`;

    const res = await fetch(url, {
      method: isEditing ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title,
        destination,
        description: description || null,
        start_date: startDate,
        end_date: endDate,
        timezone,
      }),
    });

    if (!res.ok) {
      setSaving(false);
      const json = await res.json().catch(() => ({}));
      setError(json?.message ?? 'Something went wrong. Please try again.');
      return;
    }

    const { data } = await res.json();
    setSaving(false);
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
          <h2 className={styles.formTitle}>{isEditing ? 'Edit trip' : 'New trip'}</h2>
          <button onClick={handleClose} className={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div>
            <label className={styles.label}>Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Italy Summer 2025"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>Destination *</label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Rome, Italy"
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>Start date *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>End date *</label>
            <input
              type="date"
              required
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div>
            <label className={styles.label}>Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={styles.select}
            >
              {COMMON_TIMEZONES.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={styles.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes about the trip…"
              className={styles.textarea}
            />
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          <div className={styles.formActions}>
            <button type="submit" disabled={saving} className={styles.submitBtn}>
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create trip'}
            </button>
            <button type="button" onClick={handleClose} className={styles.cancelBtnLarge}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
