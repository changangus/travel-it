<?php

namespace App\Http\Controllers;

use App\Models\Itinerary;
use App\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ItineraryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $itineraries = Itinerary::with(['events.media', 'events.note', 'dayNotes'])->orderBy('start_date')->get();

        // If the user has calendar access, verify synced events still exist in Google Calendar
        try {
            $service = new GoogleCalendarService($request->user());

            $itineraries->each(function ($itinerary) use ($service) {
                $itinerary->events
                    ->where('is_synced', true)
                    ->whereNotNull('google_event_id')
                    ->each(function ($event) use ($service) {
                        try {
                            if (! $service->eventExists($event->google_event_id)) {
                                $event->update(['is_synced' => false, 'google_event_id' => null]);
                            }
                        } catch (\Exception) {
                            // Skip — don't let a single check failure break the load
                        }
                    });
            });
        } catch (\RuntimeException) {
            // User has no Google token — skip calendar verification
        }

        // Reload to reflect any sync status changes
        $itineraries->load(['events.media', 'events.note', 'dayNotes']);

        return response()->json(['data' => $itineraries]);
    }

    public function show(Itinerary $itinerary): JsonResponse
    {
        return response()->json(['data' => $itinerary->load(['events.media', 'events.note', 'dayNotes'])]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'destination' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'timezone' => 'nullable|timezone:all',
        ]);

        $itinerary = Itinerary::create(array_merge($data, [
            'timezone' => $data['timezone'] ?? 'UTC',
        ]));

        return response()->json(['data' => $itinerary->load(['events.media', 'events.note', 'dayNotes'])], 201);
    }

    public function update(Request $request, Itinerary $itinerary): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'destination' => 'sometimes|required|string|max:255',
            'start_date'  => 'sometimes|required|date',
            'end_date'    => 'sometimes|required|date|after_or_equal:start_date',
            'timezone'    => 'sometimes|required|timezone:all',
        ]);

        $itinerary->update($data);

        return response()->json(['data' => $itinerary]);
    }
}
