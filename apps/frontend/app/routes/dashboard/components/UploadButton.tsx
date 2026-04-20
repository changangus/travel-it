import { useState, useRef } from 'react';
import type { MediaItem } from '../dashboard.types';
import styles from './UploadButton.module.css';

interface UploadButtonProps {
  eventId: number;
  token: string;
  apiBase: string;
  onUploaded: (media: MediaItem) => void;
}

export function UploadButton({ eventId, token, apiBase, onUploaded }: UploadButtonProps) {
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
