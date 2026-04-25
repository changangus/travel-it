<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Itinerary;
use App\Models\UserEventSync;
use App\Services\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class EventController extends Controller
{
    private array $rules = [
        'title' => 'required|string|max:255',
        'type' => 'required|in:activity,flight,train,transport,accommodation',
        'start_at' => 'required|date',
        'end_at' => 'nullable|date|after:start_at',
        'location' => 'nullable|string|max:255',
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
        $userSync = UserEventSync::where('user_id', $request->user()->id)
            ->where('event_id', $event->id)
            ->first();

        if ($userSync) {
            try {
                (new GoogleCalendarService($request->user()))->updateEvent($event, $userSync->google_event_id);
            } catch (\Exception) {
                $userSync->delete();
                $calendarSynced = false;
            }
        }

        $freshEvent = $event->fresh(['media', 'note']);

        // Re-query sync state after possible deletion above
        $syncRecord = UserEventSync::where('user_id', $request->user()->id)
            ->where('event_id', $freshEvent->id)
            ->first();

        $freshEvent->is_synced = (bool) $syncRecord;
        $freshEvent->google_event_id = $syncRecord?->google_event_id;

        $response = ['data' => $freshEvent];
        if (! $calendarSynced) {
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

    public function downloadAllMedia(Event $event): StreamedResponse
    {
        $event->load('media');
        $slug = str($event->title)->slug()->limit(50);
        $zipName = "{$slug}-media.zip";
        $tempPath = sys_get_temp_dir().'/'.uniqid('media_').'.zip';

        $zip = new ZipArchive;
        $zip->open($tempPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($event->media as $media) {
            if (str_starts_with($media->file_path, 'http')) {
                continue;
            }
            $absolutePath = Storage::disk('public')->path($media->file_path);
            if (file_exists($absolutePath)) {
                $zip->addFile($absolutePath, $media->file_name);
            }
        }

        $zip->close();

        return response()->streamDownload(function () use ($tempPath) {
            readfile($tempPath);
            @unlink($tempPath);
        }, $zipName, ['Content-Type' => 'application/zip']);
    }

    public function destroy(Request $request, Event $event): JsonResponse
    {
        $userSync = UserEventSync::where('user_id', $request->user()->id)
            ->where('event_id', $event->id)
            ->first();

        if ($userSync) {
            try {
                (new GoogleCalendarService($request->user()))->deleteEvent($userSync->google_event_id);
            } catch (\Exception) {
                // Non-blocking — local delete proceeds regardless
            }
        }

        $event->delete();

        return response()->json(null, 204);
    }
}
