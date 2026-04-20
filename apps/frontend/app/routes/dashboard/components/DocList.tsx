import { useState } from 'react';
import type { MediaItem } from '../dashboard.types';
import { formatBytes } from '../dashboard.utils';
import { ConfirmModal } from './ConfirmModal';
import { EllipsisMenu } from './EllipsisMenu';
import styles from './DocList.module.css';

interface DocListProps {
  docs: MediaItem[];
  onDelete: (id: number) => void;
}

export function DocList({ docs, onDelete }: DocListProps) {
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
