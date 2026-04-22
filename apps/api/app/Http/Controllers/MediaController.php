<?php

namespace App\Http\Controllers;

use App\Models\Event;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    public function store(Request $request, Event $event): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:51200', // 50 MB
        ]);

        $file = $request->file('file');
        $type = str_starts_with($file->getMimeType(), 'image/') ? 'photo' : 'document';
        $path = $file->store("events/{$event->id}", 'public');

        $media = $event->media()->create([
            'user_id' => $request->user()->id,
            'type' => $type,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
        ]);

        return response()->json(['data' => $media], 201);
    }

    public function download(Media $media): StreamedResponse
    {
        return Storage::disk('public')->download($media->file_path, $media->file_name);
    }

    public function destroy(Request $request, Media $media): JsonResponse
    {
        if ($media->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $media->delete();

        return response()->json(null, 204);
    }
}
