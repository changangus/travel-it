<?php

namespace App\Http\Controllers;

use App\Models\Itinerary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DayNoteController extends Controller
{
    public function upsert(Request $request, Itinerary $itinerary): JsonResponse
    {
        $data = $request->validate([
            'date'    => 'required|date_format:Y-m-d',
            'content' => 'nullable|string',
        ]);

        $content = $data['content'] ?? null;

        if ($content === null || $content === '') {
            $itinerary->dayNotes()->where('date', $data['date'])->delete();
            return response()->json(['data' => null]);
        }

        $dayNote = $itinerary->dayNotes()->updateOrCreate(
            ['date' => $data['date']],
            ['content' => $content]
        );

        return response()->json(['data' => $dayNote]);
    }
}
