<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Itinerary;
use App\Models\UserEventSync;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class GoogleCalendarController extends Controller
{
    public function sync(Request $request, Itinerary $itinerary)
    {
        try {
            $service = new GoogleCalendarService($request->user());
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'no_calendar_token') {
                return response()->json([
                    'message' => 'Calendar access not granted. Please sign out and sign back in.',
                ], 422);
            }
            throw $e;
        }

        $userId = $request->user()->id;
        $itinerary->load('events.media');

        $alreadySyncedIds = UserEventSync::where('user_id', $userId)
            ->whereIn('event_id', $itinerary->events->pluck('id'))
            ->pluck('event_id');

        $unsynced = $itinerary->events->whereNotIn('id', $alreadySyncedIds);
        $synced = 0;

        foreach ($unsynced as $event) {
            try {
                $googleId = $service->createEvent($event);
                UserEventSync::create([
                    'user_id' => $userId,
                    'event_id' => $event->id,
                    'google_event_id' => $googleId,
                ]);
                $synced++;
            } catch (\Exception) {
                // Skip individual failures — don't abort the whole batch
            }
        }

        return response()->json([
            'synced' => $synced,
            'events' => $this->withUserSyncStatus($itinerary->fresh('events.media')->events, $userId),
        ]);
    }

    public function syncEvent(Request $request, Event $event)
    {
        try {
            $service = new GoogleCalendarService($request->user());
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'no_calendar_token') {
                return response()->json([
                    'message' => 'Calendar access not granted. Please sign out and sign back in.',
                ], 422);
            }
            throw $e;
        }

        $userId = $request->user()->id;

        $existingSync = UserEventSync::where('user_id', $userId)
            ->where('event_id', $event->id)
            ->first();

        if ($existingSync) {
            $event->load('media');
            $event->is_synced = true;
            $event->google_event_id = $existingSync->google_event_id;

            return response()->json(['data' => $event]);
        }

        $googleId = $service->createEvent($event);
        UserEventSync::create([
            'user_id' => $userId,
            'event_id' => $event->id,
            'google_event_id' => $googleId,
        ]);

        $event = $event->fresh('media');
        $event->is_synced = true;
        $event->google_event_id = $googleId;

        return response()->json(['data' => $event]);
    }

    /**
     * Append per-user is_synced and google_event_id to a collection of events.
     */
    public static function withUserSyncStatus(Collection $events, int $userId): Collection
    {
        if ($events->isEmpty()) {
            return $events;
        }

        $syncs = UserEventSync::where('user_id', $userId)
            ->whereIn('event_id', $events->pluck('id'))
            ->pluck('google_event_id', 'event_id');

        return $events->each(function ($event) use ($syncs) {
            $event->is_synced = $syncs->has($event->id);
            $event->google_event_id = $syncs->get($event->id);
        });
    }
}
