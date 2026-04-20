<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Itinerary;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;

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

        $unsynced = $itinerary->events()->where('is_synced', false)->get();
        $synced = 0;

        foreach ($unsynced as $event) {
            try {
                $googleId = $service->createEvent($event);
                $event->update([
                    'google_event_id' => $googleId,
                    'is_synced' => true,
                ]);
                $synced++;
            } catch (\Exception) {
                // Skip individual failures — don't abort the whole batch
            }
        }

        $itinerary->load('events.media');

        return response()->json([
            'synced' => $synced,
            'events' => $itinerary->events,
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

        if ($event->is_synced) {
            $event->load('media');
            return response()->json(['data' => $event]);
        }

        $googleId = $service->createEvent($event);
        $event->update(['google_event_id' => $googleId, 'is_synced' => true]);

        return response()->json(['data' => $event->fresh('media')]);
    }
}
