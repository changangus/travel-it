import { type LoaderFunctionArgs, redirect, json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { useState } from 'react';
import { getSession } from '../services/session.server';

type EventType = 'activity' | 'transport' | 'accommodation' | 'synced';

interface TripEvent {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  type: EventType;
}

interface Itinerary {
  id: number;
  title: string;
  description: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  events: TripEvent[];
}

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
  return json({ itineraries: data as Itinerary[] });
};

// --- Helpers ---

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function getDays(itinerary: Itinerary): string[] {
  const days: string[] = [];
  const cur = new Date(itinerary.start_date);
  const end = new Date(itinerary.end_date);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function eventsForDay(events: TripEvent[], day: string) {
  return events.filter((e) => e.start_at.startsWith(day));
}

const TYPE_STYLES: Record<EventType, { icon: string; accent: string; bg: string }> = {
  transport: { icon: '🚆', accent: '#3b82f6', bg: '#eff6ff' },
  activity:  { icon: '📍', accent: '#f59e0b', bg: '#fffbeb' },
  accommodation: { icon: '🏨', accent: '#10b981', bg: '#ecfdf5' },
  synced:    { icon: '📅', accent: '#8b5cf6', bg: '#f5f3ff' },
};

// --- Components ---

function EventCard({ event }: { event: TripEvent }) {
  const s = TYPE_STYLES[event.type] ?? TYPE_STYLES.activity;
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      padding: '1rem',
      borderRadius: '10px',
      border: `1px solid ${s.accent}33`,
      background: s.bg,
    }}>
      <div style={{ fontSize: '1.4rem', lineHeight: 1, paddingTop: '2px' }}>{s.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#111' }}>{event.title}</span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 500,
            color: s.accent,
            background: `${s.accent}1a`,
            borderRadius: '99px',
            padding: '1px 8px',
            textTransform: 'capitalize',
          }}>{event.type}</span>
        </div>
        <div style={{ marginTop: '2px', fontSize: '0.85rem', color: '#6b7280' }}>
          {formatTime(event.start_at)}
          {event.end_at && ` – ${formatTime(event.end_at)}`}
          {event.location && <span style={{ color: '#9ca3af' }}> · {event.location}</span>}
        </div>
        {event.description && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.5 }}>
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✈️</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
        No trips yet
      </h2>
      <p style={{ color: '#6b7280', maxWidth: '320px', margin: '0 auto' }}>
        Your itineraries will appear here once you add your first trip.
      </p>
    </div>
  );
}

function ItineraryView({ itinerary }: { itinerary: Itinerary }) {
  const days = getDays(itinerary);
  const [activeDay, setActiveDay] = useState(days[0]);
  const dayEvents = eventsForDay(itinerary.events, activeDay);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', margin: 0 }}>
          {itinerary.title}
        </h1>
        <p style={{ marginTop: '0.25rem', fontSize: '0.9rem', color: '#6b7280' }}>
          {itinerary.destination} ·{' '}
          {new Date(itinerary.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          {' → '}
          {new Date(itinerary.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        {itinerary.description && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#4b5563' }}>
            {itinerary.description}
          </p>
        )}
      </div>

      {/* Day switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', marginBottom: '1.5rem', paddingBottom: '4px' }}>
        {days.map((day, i) => {
          const active = activeDay === day;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              style={{
                flexShrink: 0,
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${active ? '#6366f1' : '#e5e7eb'}`,
                background: active ? '#6366f1' : '#fff',
                color: active ? '#fff' : '#374151',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'center',
                lineHeight: 1.4,
              }}
            >
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.8 }}>Day {i + 1}</span>
              {formatDayLabel(day)}
            </button>
          );
        })}
      </div>

      {/* Events */}
      {dayEvents.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#9ca3af', padding: '3rem 0' }}>
          Nothing planned for this day.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {dayEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Page ---

export default function Dashboard() {
  const { itineraries } = useLoaderData<typeof loader>();

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <header style={{
        borderBottom: '1px solid #e5e7eb',
        background: '#fff',
        padding: '1rem 1.5rem',
      }}>
        <div style={{
          maxWidth: '720px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>travel-it</span>
          <Link to="/" style={{ fontSize: '0.875rem', color: '#6b7280', textDecoration: 'none' }}>
            ← Home
          </Link>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {itineraries.length === 0 ? (
          <EmptyState />
        ) : (
          <ItineraryView itinerary={itineraries[0]} />
        )}
      </main>
    </div>
  );
}
