<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Note extends Model
{
    protected $fillable = ['event_id', 'content'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
