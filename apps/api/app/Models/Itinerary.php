<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Itinerary extends Model
{
    protected $fillable = ['title', 'description', 'destination', 'start_date', 'end_date', 'timezone'];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function events(): HasMany
    {
        return $this->hasMany(Event::class)->orderBy('start_at');
    }

    public function dayNotes(): HasMany
    {
        return $this->hasMany(DayNote::class)->orderBy('date');
    }
}
