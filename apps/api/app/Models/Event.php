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
        'start_at', 'end_at', 'type',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
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

    public function userSyncs(): HasMany
    {
        return $this->hasMany(UserEventSync::class);
    }
}
