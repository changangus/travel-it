import { useState } from 'react';
import type { TripEvent, MediaItem } from '../dashboard.types';
import { TYPE_STYLES } from '../dashboard.constants';
import { formatTime } from '../dashboard.utils';
import { EllipsisMenu } from './EllipsisMenu';
import { PhotoGrid } from './PhotoGrid';
import { DocList } from './DocList';
import { UploadButton } from './UploadButton';
import { ConfirmModal } from './ConfirmModal';
import styles from './EventCard.module.css';

interface EventCardProps {
  event: TripEvent;
  timezone: string;
  token: string;
  apiBase: string;
  onEdit: () => void;
  onDeleted: (id: number) => void;
  onSynced: (event: TripEvent) => void;
}

export function EventCard({
  event,
  timezone,
  token,
  apiBase,
  onEdit,
  onDeleted,
  onSynced,
}: EventCardProps) {
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
