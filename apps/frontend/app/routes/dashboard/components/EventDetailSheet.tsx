import { useState } from 'react';
import type { TripEvent, MediaItem } from '../dashboard.types';
import { TYPE_STYLES } from '../dashboard.constants';
import { formatTime } from '../dashboard.utils';
import { PhotoGrid } from './PhotoGrid';
import { DocList } from './DocList';
import { UploadButton } from './UploadButton';
import { ConfirmModal } from './ConfirmModal';
import styles from './EventDetailSheet.module.css';

interface EventDetailSheetProps {
  event: TripEvent;
  timezone: string;
  use24h: boolean;
  token: string;
  apiBase: string;
  isCheckin?: boolean;
  onEdit: () => void;
  onDeleted: (id: number) => void;
  onSynced: (event: TripEvent) => void;
  onClose: () => void;
}

export function EventDetailSheet({
  event,
  timezone,
  use24h,
  token,
  apiBase,
  isCheckin = false,
  onEdit,
  onDeleted,
  onSynced,
  onClose,
}: EventDetailSheetProps) {
  const s = TYPE_STYLES[event.type] ?? TYPE_STYLES.activity;
  const [media, setMedia] = useState<MediaItem[]>(event.media);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  };

  const handleSync = async () => {
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

  const handleDelete = async () => {
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

  const handleMediaDelete = async (id: number) => {
    const res = await fetch(`${apiBase}/api/media/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  // Type-specific tag class
  let tagClass = styles.typeTagActivity;
  if (event.type === 'flight') tagClass = styles.typeTagFlight;
  if (event.type === 'train') tagClass = styles.typeTagTrain;
  if (event.type === 'transport') tagClass = styles.typeTagTransport;
  if (event.type === 'accommodation') tagClass = styles.typeTagAccommodation;
  if (event.type === 'synced') tagClass = styles.typeTagSynced;

  const timeLabel = isCheckin && event.type === 'accommodation'
    ? `Check in · ${formatTime(event.start_at, timezone, use24h)}`
    : `${formatTime(event.start_at, timezone, use24h)}${event.end_at ? ` – ${formatTime(event.end_at, timezone, use24h)}` : ''}`;

  const photos = media.filter((m) => m.type === 'photo');
  const docs = media.filter((m) => m.type === 'document');

  return (
    <>
      <div
        onClick={handleClose}
        className={isClosing ? `${styles.backdrop} ${styles.backdropExit}` : `${styles.backdrop} ${styles.backdropEnter}`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={isClosing ? `${styles.panel} ${styles.panelExit}` : `${styles.panel} ${styles.panelEnter}`}
        >
          <div className={styles.dragHandleContainer}>
            <div className={styles.dragHandle} />
          </div>

          <div className={styles.header}>
            <div className={styles.titleBlock}>
              <div className={styles.titleRow}>
                <span className={styles.icon}>{s.icon}</span>
                <span className={styles.title}>{event.title}</span>
                <span className={`${styles.typeTag} ${tagClass}`}>{event.type}</span>
                {event.is_synced && (
                  <span className={styles.syncedTag}>📅 synced</span>
                )}
              </div>
              <div className={styles.meta}>
                {timeLabel}
                {event.location && (
                  <span className={styles.location}> · {event.location}</span>
                )}
              </div>
            </div>
            <button onClick={handleClose} className={styles.closeBtn}>✕</button>
          </div>

          <div className={styles.body}>
            {event.description && (
              <p className={styles.description}>{event.description}</p>
            )}

            {event.note?.content && (
              <div className={styles.noteBlock}>
                <div className={styles.sectionLabel}>Journal notes</div>
                <p className={styles.noteText}>{event.note.content}</p>
              </div>
            )}

            {(photos.length > 0 || docs.length > 0 || true) && (
              <div className={styles.mediaSection}>
                {photos.length > 0 && (
                  <PhotoGrid photos={photos} onDelete={handleMediaDelete} />
                )}
                {docs.length > 0 && (
                  <DocList docs={docs} onDelete={handleMediaDelete} />
                )}
                <UploadButton
                  eventId={event.id}
                  token={token}
                  apiBase={apiBase}
                  onUploaded={(m) => setMedia((prev) => [...prev, m])}
                />
                {media.length > 1 && (
                  <a
                    href={`/resources/events/${event.id}/download-all`}
                    download
                    className={styles.downloadLink}
                  >
                    ↓ Download all media
                  </a>
                )}
              </div>
            )}

            {syncError && <p className={styles.syncError}>{syncError}</p>}

            <div className={styles.actions}>
              <button onClick={onEdit} className={styles.editBtn}>
                Edit event
              </button>
              {!event.is_synced && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className={styles.syncBtn}
                >
                  {syncing ? 'Syncing…' : '📅 Sync to calendar'}
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
                className={styles.deleteBtn}
              >
                {deleting ? 'Deleting…' : 'Delete event'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`Delete "${event.title}"? This cannot be undone.`}
          onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
