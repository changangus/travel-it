export type EventType = 'activity' | 'transport' | 'accommodation' | 'synced';

export interface MediaItem {
  id: number;
  type: 'photo' | 'document';
  file_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
}

export interface TripEvent {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  type: EventType;
  google_event_id: string | null;
  is_synced: boolean;
  media: MediaItem[];
}

export interface Itinerary {
  id: number;
  title: string;
  description: string | null;
  destination: string;
  start_date: string;
  end_date: string;
  timezone: string;
  events: TripEvent[];
}
