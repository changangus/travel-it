<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $newTypes = ['activity', 'flight', 'train', 'transport', 'accommodation', 'synced'];
    private array $oldTypes = ['activity', 'transport', 'accommodation', 'synced'];

    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildForSqlite($this->newTypes);
        } else {
            $list = implode("','", $this->newTypes);
            DB::statement("ALTER TABLE events MODIFY COLUMN type ENUM('{$list}') NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildForSqlite($this->oldTypes);
        } else {
            $list = implode("','", $this->oldTypes);
            DB::statement("ALTER TABLE events MODIFY COLUMN type ENUM('{$list}') NOT NULL");
        }
    }

    private function rebuildForSqlite(array $types): void
    {
        DB::statement('PRAGMA foreign_keys = OFF');

        Schema::create('events_new', function (Blueprint $table) use ($types) {
            $table->id();
            $table->foreignId('itinerary_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->dateTime('start_at');
            $table->dateTime('end_at')->nullable();
            $table->enum('type', $types);
            $table->string('google_event_id')->nullable();
            $table->boolean('is_synced')->default(false);
            $table->timestamps();
        });

        DB::statement('INSERT INTO events_new SELECT * FROM events');

        Schema::drop('events');

        DB::statement('ALTER TABLE events_new RENAME TO events');

        DB::statement('PRAGMA foreign_keys = ON');
    }
};
