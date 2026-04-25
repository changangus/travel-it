import { useState } from 'react';
import { type LoaderFunctionArgs, redirect, json } from '@remix-run/node';
import { useLoaderData, Link, useSearchParams } from '@remix-run/react';
import styles from './dashboard.module.css';
import { getSession } from '../../services/session.server';
import type { Itinerary } from './dashboard.types';
import { EmptyState } from './components/EmptyState';
import { ItineraryView } from './components/ItineraryView';
import { TripFormModal } from './components/TripFormModal';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
  const session = await getSession(request.headers.get('Cookie'));
  const token = session.get('token');

  if (!token) return redirect('/login');

  const res = await fetch(`${baseUrl}/api/itineraries`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) return redirect('/login');

  const { data } = await res.json();
  return json({ itineraries: data as Itinerary[], token, apiBase: baseUrl });
};

export default function Dashboard() {
  const { itineraries: initial, token, apiBase } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const eventIdParam = searchParams.get('eventId') ? Number(searchParams.get('eventId')) : null;

  const [itineraries, setItineraries] = useState<Itinerary[]>(initial);

  const initialActiveIndex = eventIdParam
    ? Math.max(0, initial.findIndex((it) => it.events.some((e) => e.id === eventIdParam)))
    : 0;

  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const [modalTrip, setModalTrip] = useState<Itinerary | 'new' | null>(null);

  const activeTrip = itineraries[activeIndex] ?? itineraries[0];

  const handleTripSaved = (saved: Itinerary) => {
    setItineraries((prev) => {
      const exists = prev.findIndex((t) => t.id === saved.id);
      if (exists !== -1) {
        const next = prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t));
        return next;
      }
      setActiveIndex(prev.length);
      return [...prev, saved];
    });
    setModalTrip(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.logo}>travel-it</span>
          <div className={styles.headerActions}>
            <button onClick={() => setModalTrip('new')} className={styles.newTripBtn}>
              + New trip
            </button>
            <Link to="/photos" className={styles.homeLink}>Photos</Link>
            <Link to="/" className={styles.homeLink}>← Home</Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {itineraries.length === 0 ? (
          <EmptyState onAddTrip={() => setModalTrip('new')} />
        ) : (
          <>
            {itineraries.length > 1 && (
              <div className={styles.tripSwitcher}>
                {itineraries.map((trip, i) => (
                  <button
                    key={trip.id}
                    onClick={() => setActiveIndex(i)}
                    className={i === activeIndex ? styles.tripBtnActive : styles.tripBtn}
                  >
                    {trip.title}
                  </button>
                ))}
              </div>
            )}
            <ItineraryView
              key={activeTrip.id}
              itinerary={activeTrip}
              token={token}
              apiBase={apiBase}
              onEditTrip={() => setModalTrip(activeTrip)}
              initialEventId={eventIdParam ?? undefined}
            />
          </>
        )}
      </main>

      {modalTrip !== null && (
        <TripFormModal
          itinerary={modalTrip === 'new' ? undefined : modalTrip}
          token={token}
          apiBase={apiBase}
          onSaved={handleTripSaved}
          onClose={() => setModalTrip(null)}
        />
      )}
    </div>
  );
}
