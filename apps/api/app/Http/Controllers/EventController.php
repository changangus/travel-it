<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Itinerary;
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
        $event->load('media');

        return response()->json(['data' => $event], 201);
    }

    public function update(Request $request, Event $event): JsonResponse
    {
        $data = $request->validate($this->rules);

        $event->update($data);
        $event->load('media');

        return response()->json(['data' => $event]);
    }

    public function destroy(Event $event): JsonResponse
    {
        $event->delete();

        return response()->json(null, 204);
    }
}
