<?php

namespace App\Http\Controllers;

use App\Models\Itinerary;
use Illuminate\Http\JsonResponse;

class ItineraryController extends Controller
{
    public function index(): JsonResponse
    {
        $itineraries = Itinerary::with('events')->orderBy('start_date')->get();

        return response()->json(['data' => $itineraries]);
    }

    public function show(Itinerary $itinerary): JsonResponse
    {
        return response()->json(['data' => $itinerary->load('events')]);
    }
}
