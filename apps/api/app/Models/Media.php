<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Media extends Model
{
    protected $fillable = [
        'event_id', 'user_id', 'type', 'file_name', 'file_path', 'mime_type', 'size_bytes',
    ];

    protected $appends = ['url'];

    public function getUrlAttribute(): string
    {
        // Mock/external URLs are stored as-is
        if (str_starts_with($this->file_path, 'http')) {
            return $this->file_path;
        }

        return Storage::disk('s3')->temporaryUrl($this->file_path, now()->addHour());
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
