<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Itinerary;
use App\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    private array $rules = [
        'title'       => 'required|string|max:255',
        'type'        => 'required|in:activity,transport,accommodation',
        'start_at'    => 'required|date',
        'end_at'      => 'nullable|date|after:start_at',
        'location'    => 'nullable|string|max:255',
        'description' => 'nullable|string',
    ];

    public function store(Request $request, Itinerary $itinerary): JsonResponse
    {
        $data = $request->validate($this->rules);

        $event = $itinerary->events()->create($data);
        $event->load(['media', 'note']);

        return response()->json(['data' => $event], 201);
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        $data = $request->validate($this->rules);

        $event->update($data);
        $event->load(['media', 'note']);

        $calendarSynced = true;
        if ($event->is_synced && $event->google_event_id) {
            try {
                (new GoogleCalendarService($request->user()))->updateEvent($event);
            } catch (\Exception) {
                $event->update(['is_synced' => false, 'google_event_id' => null]);
                $calendarSynced = false;
            }
        }

        $response = ['data' => $event->fresh(['media', 'note'])];
        if (!$calendarSynced) {
            $response['calendar_sync'] = false;
        }

        return response()->json($response);
    }

    public function upsertNote(Request $request, Event $event): JsonResponse
    {
        $data = $request->validate(['content' => 'nullable|string']);

        $content = $data['content'] ?? null;

        if ($content === null || $content === '') {
            $event->note?->delete();
        } else {
            $event->note()->updateOrCreate(
                ['event_id' => $event->id],
                ['content' => $content]
            );
        }

        return response()->json(['data' => $event->fresh(['media', 'note'])]);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        if ($event->is_synced && $event->google_event_id) {
            try {
                (new GoogleCalendarService($request->user()))->deleteEvent($event->google_event_id);
            } catch (\Exception) {
                // Non-blocking — local delete proceeds regardless
            }
        }

        $event->delete();

        return response()->json(null, 204);
    }
}
