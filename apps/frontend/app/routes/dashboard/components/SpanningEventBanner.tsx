import { useState } from 'react';
import type { TripEvent } from '../dashboard.types';
import { TYPE_STYLES } from '../dashboard.constants';
import { dateParts, formatTime, formatDayLabel } from '../dashboard.utils';
import { EllipsisMenu } from './EllipsisMenu';
import { ConfirmModal } from './ConfirmModal';
import styles from './SpanningEventBanner.module.css';

interface SpanningEventBannerProps {
  event: TripEvent;
  day: string;
  timezone: string;
  use24h: boolean;
  token: string;
  apiBase: string;
  onEdit: () => void;
  onDeleted: (id: number) => void;
}

function getBannerLabel(event: TripEvent, day: string, timezone: string, use24h: boolean): string {
  const endDay = event.end_at ? dateParts(event.end_at, timezone) : null;
  const isCheckoutDay = endDay === day;

  if (event.type === 'accommodation') {
    if (isCheckoutDay) return `Check out at ${formatTime(event.end_at!, timezone, use24h)}`;
    return 'Staying';
  }

  if (isCheckoutDay) return `Until ${formatTime(event.end_at!, timezone, use24h)}`;
  return `Until ${formatDayLabel(endDay!, timezone)}`;
}

export function SpanningEventBanner({
  event,
  day,
  timezone,
  use24h,
  token,
  apiBase,
  onEdit,
  onDeleted,
}: SpanningEventBannerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const s = TYPE_STYLES[event.type] ?? TYPE_STYLES.activity;
  const label = getBannerLabel(event, day, timezone, use24h);
  const bannerTypeClass = styles[`banner_${event.type}` as keyof typeof styles];

  const handleDelete = async () => {
    const res = await fetch(`${apiBase}/api/events/${event.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) onDeleted(event.id);
  };

  return (
    <>
      <div className={`${styles.banner} ${bannerTypeClass ?? ''}`}>
        <div className={styles.accentStripe} />
        <span className={styles.icon}>{s.icon}</span>
        <span className={styles.title}>{event.title}</span>
        <span className={styles.label}>{label}</span>
        <div className={styles.actions}>
          <EllipsisMenu items={[
            { label: 'Edit', onClick: onEdit },
            { label: 'Delete', danger: true, onClick: () => setConfirmDelete(true) },
          ]} />
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
