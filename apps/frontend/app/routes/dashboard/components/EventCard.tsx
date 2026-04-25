import { useState } from 'react';
import type { TripEvent } from '../dashboard.types';
import { TYPE_STYLES } from '../dashboard.constants';
import { formatTime } from '../dashboard.utils';
import { EllipsisMenu } from './EllipsisMenu';
import { ConfirmModal } from './ConfirmModal';
import styles from './EventCard.module.css';

interface EventCardProps {
  event: TripEvent;
  timezone: string;
  use24h: boolean;
  token: string;
  apiBase: string;
  onEdit: () => void;
  onViewDetail: () => void;
  onDeleted: (id: number) => void;
  onSynced: (event: TripEvent) => void;
  isCheckin?: boolean;
}

export function EventCard({
  event,
  timezone,
  use24h,
  token,
  apiBase,
  onEdit,
  onViewDetail,
  onDeleted,
  onSynced,
  isCheckin = false,
}: EventCardProps) {
  const s = TYPE_STYLES[event.type] ?? TYPE_STYLES.activity;
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

  // Determine type-specific card class
  let cardTypeClass = styles.eventCardActivity;
  if (event.type === 'flight') cardTypeClass = styles.eventCardFlight;
  if (event.type === 'train') cardTypeClass = styles.eventCardTrain;
  if (event.type === 'transport') cardTypeClass = styles.eventCardTransport;
  if (event.type === 'accommodation') cardTypeClass = styles.eventCardAccommodation;
  if (event.type === 'synced') cardTypeClass = styles.eventCardSynced;

  // Determine type-specific tag class
  let tagTypeClass = styles.eventTypeTagActivity;
  if (event.type === 'flight') tagTypeClass = styles.eventTypeTagFlight;
  if (event.type === 'train') tagTypeClass = styles.eventTypeTagTrain;
  if (event.type === 'transport') tagTypeClass = styles.eventTypeTagTransport;
  if (event.type === 'accommodation') tagTypeClass = styles.eventTypeTagAccommodation;
  if (event.type === 'synced') tagTypeClass = styles.eventTypeTagSynced;

  return (
    <>
      <div className={`${cardTypeClass} ${deleting ? styles.eventCardDeleting : ''}`}>
        <div className={styles.eventHeader}>
          <button
            className={styles.eventClickable}
            onClick={onViewDetail}
          >
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
                {isCheckin && event.type === 'accommodation'
                  ? `Check in · ${formatTime(event.start_at, timezone, use24h)}`
                  : (
                    <>
                      {formatTime(event.start_at, timezone, use24h)}
                      {event.end_at && !isCheckin && ` – ${formatTime(event.end_at, timezone, use24h)}`}
                    </>
                  )
                }
                {event.location && <span className={styles.eventLocation}> · {event.location}</span>}
              </div>
            </div>
          </button>

          <div className={styles.eventActions}>
            <EllipsisMenu items={[
              { label: 'View details', onClick: onViewDetail },
              { label: 'Edit', onClick: onEdit },
              ...(!event.is_synced ? [{ label: syncing ? 'Syncing…' : '📅 Sync', onClick: handleSyncEvent }] : []),
              { label: 'Delete', danger: true, onClick: () => setConfirmDelete(true) },
            ]} />
          </div>
        </div>

        {syncError && (
          <p className={styles.itineraryError}>{syncError}</p>
        )}
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
