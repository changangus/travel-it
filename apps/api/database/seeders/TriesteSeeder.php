<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Itinerary;
use Illuminate\Database\Seeder;

class TriesteSeeder extends Seeder
{
    public function run(): void
    {
        $itinerary = Itinerary::create([
            'title' => 'Weekend in Trieste',
            'description' => 'A short escape to the Adriatic coast — coffee culture, Habsburg architecture, and fresh seafood.',
            'destination' => 'Trieste, Italy',
            'start_date' => '2026-05-02',
            'end_date' => '2026-05-03',
        ]);

        // Day 1 — Saturday, 2 May
        Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Train to Trieste',
            'description' => 'Trenitalia regional express. Pick up a coffee at the platform bar before boarding.',
            'location' => 'Milano Centrale → Trieste Centrale',
            'start_at' => '2026-05-02 07:30:00',
            'end_at' => '2026-05-02 11:15:00',
            'type' => 'transport',
        ]);

        Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Lunch at Buffet da Pepi',
            'description' => 'The oldest buffet in Trieste, famous for its boiled meats and mustard. Try the jota bean soup.',
            'location' => 'Via Cassa di Risparmio 3, Trieste',
            'start_at' => '2026-05-02 12:00:00',
            'end_at' => '2026-05-02 13:30:00',
            'type' => 'activity',
        ]);

        Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Museo Revoltella',
            'description' => 'Trieste\'s modern art museum housed in a 19th-century palazzo. The rooftop terrace has sweeping harbour views.',
            'location' => 'Via Armando Diaz 27, Trieste',
            'start_at' => '2026-05-02 14:30:00',
            'end_at' => '2026-05-02 17:00:00',
            'type' => 'activity',
        ]);

        Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Dinner at La Bottega del Vino',
            'description' => 'Intimate enoteca with a great Friulian wine list. Book the baccalà and finish with a glass of Ribolla Gialla.',
            'location' => 'Via Valdirivo 14, Trieste',
            'start_at' => '2026-05-02 20:00:00',
            'end_at' => '2026-05-02 22:30:00',
            'type' => 'activity',
        ]);

        // Day 2 — Sunday, 3 May
        Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Caffè degli Specchi',
            'description' => 'Morning coffee on Piazza Unità d\'Italia overlooking the sea. A Triestino ritual.',
            'location' => 'Piazza Unità d\'Italia 7, Trieste',
            'start_at' => '2026-05-03 09:00:00',
            'end_at' => '2026-05-03 09:45:00',
            'type' => 'activity',
        ]);

        Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Castello di Miramare',
            'description' => 'Romantic 19th-century castle built for Archduke Maximilian. Walk the clifftop gardens before the crowds arrive.',
            'location' => 'Viale Miramare, Trieste',
            'start_at' => '2026-05-03 10:30:00',
            'end_at' => '2026-05-03 13:00:00',
            'type' => 'activity',
        ]);

        Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Lunch at Ai Fiori',
            'description' => 'Simple seafood trattoria near the fish market. The grilled sardines are exceptional.',
            'location' => 'Piazza Hortis 7, Trieste',
            'start_at' => '2026-05-03 13:30:00',
            'end_at' => '2026-05-03 15:00:00',
            'type' => 'activity',
        ]);

        Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Train back to Milan',
            'description' => 'Direct Trenitalia service. Pick up some Illy coffee beans at the station shop.',
            'location' => 'Trieste Centrale → Milano Centrale',
            'start_at' => '2026-05-03 16:30:00',
            'end_at' => '2026-05-03 20:15:00',
            'type' => 'transport',
        ]);
    }
}
