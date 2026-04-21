import { useState } from 'react';
import type { MediaItem } from '../dashboard.types';
import { ConfirmModal } from './ConfirmModal';
import { EllipsisMenu } from './EllipsisMenu';
import styles from './PhotoGrid.module.css';

interface PhotoGridProps {
  photos: MediaItem[];
  onDelete: (id: number) => void;
}

export function PhotoGrid({ photos, onDelete }: PhotoGridProps) {
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  return (
    <>
      <div className={styles.photoGrid}>
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={styles.photoItem}
          >
            <div
              className={styles.photoWrapper}
              onClick={() => setLightbox(photo)}
            >
              <img
                src={photo.url}
                alt={photo.file_name}
                className={styles.photoImg}
              />
            </div>
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
            src={lightbox.url}
            alt={lightbox.file_name}
            className={styles.lightboxImg}
          />
          <a
            href={`/resources/media/${lightbox.id}/download`}
            download={lightbox.file_name}
            onClick={(e) => e.stopPropagation()}
            className={styles.lightboxDownload}
          >
            ↓ Download
          </a>
        </div>
      )}
    </>
  );
}
