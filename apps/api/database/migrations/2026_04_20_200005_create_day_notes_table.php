<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('day_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('itinerary_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->text('content');
            $table->timestamps();
            $table->unique(['itinerary_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('day_notes');
    }
};
