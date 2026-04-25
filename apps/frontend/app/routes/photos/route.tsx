import { useState, useEffect, useCallback } from 'react';
import { type LoaderFunctionArgs, redirect, json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { getSession } from '../../services/session.server';
import type { Itinerary, TripEvent, MediaItem } from '../dashboard/dashboard.types';
import styles from './photos.module.css';

interface PhotoEntry {
  photo: MediaItem;
  event: TripEvent;
  itinerary: Itinerary;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('token');

  if (!token) return redirect('/login');

  const res = await fetch(`${baseUrl}/api/itineraries`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (!res.ok) return redirect('/login');

  const { data } = await res.json();
  const itineraries = data as Itinerary[];

  const photos: PhotoEntry[] = [];
  for (const itinerary of itineraries) {
    for (const event of itinerary.events) {
      for (const media of event.media) {
        if (media.type === 'photo') {
          photos.push({ photo: media, event, itinerary });
        }
      }
    }
  }

  return json({ photos });
};

export default function Photos() {
  const { photos } = useLoaderData<typeof loader>();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const goNext = useCallback(() => setLightboxIndex((i) => (i !== null ? (i + 1) % photos.length : null)), [photos.length]);
  const goPrev = useCallback(() => setLightboxIndex((i) => (i !== null ? (i - 1 + photos.length) % photos.length : null)), [photos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, goNext, goPrev, closeLightbox]);

  const current = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.logo}>travel-it</span>
          <Link to="/dashboard" className={styles.backLink}>← Dashboard</Link>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Photos</h1>
        {photos.length === 0 ? (
          <p className={styles.empty}>No photos yet. Upload photos to your events to see them here.</p>
        ) : (
          <div className={styles.grid}>
            {photos.map((entry, i) => (
              <button
                key={entry.photo.id}
                className={styles.thumb}
                onClick={() => setLightboxIndex(i)}
              >
                <img
                  src={entry.photo.url}
                  alt={entry.photo.file_name}
                  className={styles.thumbImg}
                />
              </button>
            ))}
          </div>
        )}
      </main>

      {current !== null && lightboxIndex !== null && (
        <div className={styles.lightboxBackdrop} onClick={closeLightbox}>
          <button
            className={`${styles.navBtn} ${styles.navBtnPrev}`}
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            aria-label="Previous photo"
          >
            ‹
          </button>

          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={current.photo.url}
              alt={current.photo.file_name}
              className={styles.lightboxImg}
            />
            <div className={styles.lightboxInfo}>
              <div className={styles.lightboxMeta}>
                <Link
                  to={`/dashboard?eventId=${current.event.id}`}
                  className={styles.eventLink}
                  onClick={closeLightbox}
                >
                  {current.event.title}
                </Link>
                <span className={styles.itineraryLabel}>{current.itinerary.title}</span>
              </div>
              <div className={styles.lightboxCounter}>
                {lightboxIndex + 1} / {photos.length}
              </div>
              <a
                href={`/resources/media/${current.photo.id}/download`}
                download={current.photo.file_name}
                className={styles.downloadLink}
              >
                ↓ Download
              </a>
            </div>
          </div>

          <button
            className={`${styles.navBtn} ${styles.navBtnNext}`}
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            aria-label="Next photo"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
