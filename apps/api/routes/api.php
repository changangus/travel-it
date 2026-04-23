<?php

use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\DayNoteController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\GoogleCalendarController;
use App\Http\Controllers\ItineraryController;
use App\Http\Controllers\MediaController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('throttle:login')->group(function () {
    Route::post('/login', [LoginController::class, 'login']);
    Route::get('/auth/google', [GoogleController::class, 'redirect']);
    Route::get('/auth/google/callback', [GoogleController::class, 'callback']);
});

Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('/itineraries', [ItineraryController::class, 'index']);
    Route::post('/itineraries', [ItineraryController::class, 'store']);
    Route::get('/itineraries/{itinerary}', [ItineraryController::class, 'show']);
    Route::patch('/itineraries/{itinerary}', [ItineraryController::class, 'update']);
    Route::post('/itineraries/{itinerary}/events', [EventController::class, 'store']);
    Route::patch('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);
    Route::get('/media/{media}/download', [MediaController::class, 'download']);
    Route::delete('/media/{media}', [MediaController::class, 'destroy']);
    Route::get('/events/{event}/media/download-all', [EventController::class, 'downloadAllMedia']);
    Route::put('/events/{event}/note', [EventController::class, 'upsertNote']);
    Route::put('/itineraries/{itinerary}/day-notes', [DayNoteController::class, 'upsert']);
});

Route::middleware(['auth:sanctum', 'throttle:media-upload'])->group(function () {
    Route::post('/events/{event}/media', [MediaController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'throttle:calendar-sync'])->group(function () {
    Route::post('/itineraries/{itinerary}/sync-to-calendar', [GoogleCalendarController::class, 'sync']);
    Route::post('/events/{event}/sync-to-calendar', [GoogleCalendarController::class, 'syncEvent']);
});
