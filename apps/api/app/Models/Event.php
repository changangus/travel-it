<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Event extends Model
{
    protected $fillable = [
        'itinerary_id', 'title', 'description', 'location',
        'start_at', 'end_at', 'type', 'google_event_id', 'is_synced',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'is_synced' => 'boolean',
    ];

    public function itinerary(): BelongsTo
    {
        return $this->belongsTo(Itinerary::class);
    }

    public function media(): HasMany
    {
        return $this->hasMany(Media::class)->orderBy('created_at');
    }

    public function note(): HasOne
    {
        return $this->hasOne(Note::class);
    }
}
