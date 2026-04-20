<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\ItineraryController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\MediaController;

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/login', [LoginController::class, 'login']);

Route::get('/auth/google', [GoogleController::class, 'redirect']);
Route::get('/auth/google/callback', [GoogleController::class, 'callback']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/itineraries', [ItineraryController::class, 'index']);
    Route::get('/itineraries/{itinerary}', [ItineraryController::class, 'show']);
    Route::post('/itineraries/{itinerary}/events', [EventController::class, 'store']);
    Route::patch('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);
    Route::post('/events/{event}/media', [MediaController::class, 'store']);
    Route::delete('/media/{media}', [MediaController::class, 'destroy']);
});
