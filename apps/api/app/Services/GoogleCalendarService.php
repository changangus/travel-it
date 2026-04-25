<?php

namespace App\Services;

use App\Models\Event;
use App\Models\User;
use Google\Client;
use Google\Service\Calendar;
use Google\Service\Calendar\Event as GoogleEvent;
use Google\Service\Calendar\EventDateTime;
use Google\Service\Exception;
use RuntimeException;

class GoogleCalendarService
{
    private Calendar $calendar;

    private User $user;

    public function __construct(User $user)
    {
        if (! $user->google_refresh_token) {
            throw new RuntimeException('no_calendar_token');
        }

        $this->user = $user;

        $client = new Client;
        $client->setClientId(config('services.google.client_id'));
        $client->setClientSecret(config('services.google.client_secret'));
        $client->setAccessType('offline');

        $accessToken = [
            'access_token' => $user->google_access_token,
            'refresh_token' => $user->google_refresh_token,
            'expires_in' => $user->google_token_expiry
                ? max(0, now()->diffInSeconds($user->google_token_expiry, false))
                : 0,
            'token_type' => 'Bearer',
        ];

        $client->setAccessToken($accessToken);

        if ($client->isAccessTokenExpired()) {
            $newToken = $client->fetchAccessTokenWithRefreshToken($user->google_refresh_token);
            $user->update([
                'google_access_token' => $newToken['access_token'],
                'google_token_expiry' => isset($newToken['expires_in'])
                    ? now()->addSeconds($newToken['expires_in'])
                    : null,
            ]);
            $client->setAccessToken($newToken);
        }

        $this->calendar = new Calendar($client);
    }

    public function createEvent(Event $event): string
    {
        $googleEvent = $this->buildGoogleEvent($event);
        $created = $this->calendar->events->insert('primary', $googleEvent);

        return $created->getId();
    }

    public function updateEvent(Event $event, string $googleEventId): void
    {
        $googleEvent = $this->buildGoogleEvent($event);
        $this->calendar->events->update('primary', $googleEventId, $googleEvent);
    }

    public function deleteEvent(string $googleEventId): void
    {
        $this->calendar->events->delete('primary', $googleEventId);
    }

    /**
     * Returns false if the event has been deleted or cancelled in Google Calendar.
     */
    public function eventExists(string $googleEventId): bool
    {
        try {
            $event = $this->calendar->events->get('primary', $googleEventId);

            return $event->getStatus() !== 'cancelled';
        } catch (Exception $e) {
            if ($e->getCode() === 404 || $e->getCode() === 410) {
                return false;
            }
            throw $e;
        }
    }

    private function buildGoogleEvent(Event $event): GoogleEvent
    {
        $googleEvent = new GoogleEvent;
        $googleEvent->setSummary($event->title);

        if ($event->description) {
            $googleEvent->setDescription($event->description);
        }

        if ($event->location) {
            $googleEvent->setLocation($event->location);
        }

        $start = new EventDateTime;
        $end = new EventDateTime;

        if ($event->end_at) {
            $start->setDateTime($event->start_at->toRfc3339String());
            $start->setTimeZone('UTC');
            $end->setDateTime($event->end_at->toRfc3339String());
            $end->setTimeZone('UTC');
        } else {
            // All-day or point-in-time — use the date only with a 1-hour implied end
            $start->setDateTime($event->start_at->toRfc3339String());
            $start->setTimeZone('UTC');
            $end->setDateTime($event->start_at->copy()->addHour()->toRfc3339String());
            $end->setTimeZone('UTC');
        }

        $googleEvent->setStart($start);
        $googleEvent->setEnd($end);

        return $googleEvent;
    }
}
