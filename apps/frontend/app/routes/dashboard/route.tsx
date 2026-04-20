import { type LoaderFunctionArgs, redirect, json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import styles from './dashboard.module.css';
import { getSession } from '../../services/session.server';
import type { Itinerary } from './dashboard.types';
import { EmptyState } from './components/EmptyState';
import { ItineraryView } from './components/ItineraryView';

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
  const { itineraries, token, apiBase } = useLoaderData<typeof loader>();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.logo}>travel-it</span>
          <Link to="/" className={styles.homeLink}>← Home</Link>
        </div>
      </header>

      <main className={styles.main}>
        {itineraries.length === 0 ? (
          <EmptyState />
        ) : (
          <ItineraryView itinerary={itineraries[0]} token={token} apiBase={apiBase} />
        )}
      </main>
    </div>
  );
}
