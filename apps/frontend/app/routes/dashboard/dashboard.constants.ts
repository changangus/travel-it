import type { EventType } from './dashboard.types';

export const COMMON_TIMEZONES = [
  { label: 'New York', value: 'America/New_York' },
  { label: 'Italy (Rome)', value: 'Europe/Rome' },
];

export const TYPE_STYLES: Record<EventType, { icon: string }> = {
  flight:        { icon: '✈️' },
  train:         { icon: '🚂' },
  transport:     { icon: '🚌' },
  activity:      { icon: '📍' },
  accommodation: { icon: '🏨' },
  synced:        { icon: '📅' },
};
