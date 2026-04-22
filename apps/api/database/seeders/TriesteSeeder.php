<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\Itinerary;
use App\Models\Media;
use App\Models\User;
use Illuminate\Database\Seeder;

class TriesteSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'changangus2@gmail.com')->firstOrFail();

        $itinerary = Itinerary::create([
            'title' => 'Weekend in Trieste',
            'description' => 'A short escape to the Adriatic coast — coffee culture, Habsburg architecture, and fresh seafood.',
            'destination' => 'Trieste, Italy',
            'start_date' => '2026-05-02',
            'end_date' => '2026-05-03',
        ]);

        // Day 1 — Saturday, 2 May

        $train1 = Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Train to Trieste',
            'description' => 'Trenitalia regional express. Pick up a coffee at the platform bar before boarding.',
            'location' => 'Milano Centrale → Trieste Centrale',
            'start_at' => '2026-05-02 07:30:00',
            'end_at' => '2026-05-02 11:15:00',
            'type' => 'transport',
        ]);

        // Train ticket (mock document)
        Media::create([
            'event_id' => $train1->id,
            'user_id' => $user->id,
            'type' => 'document',
            'file_name' => 'train-ticket-MXP-TRS.pdf',
            'file_path' => 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.jpg', // placeholder
            'mime_type' => 'application/pdf',
            'size_bytes' => 142080,
        ]);

        $lunch1 = Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Lunch at Buffet da Pepi',
            'description' => 'The oldest buffet in Trieste, famous for its boiled meats and mustard. Try the jota bean soup.',
            'location' => 'Via Cassa di Risparmio 3, Trieste',
            'start_at' => '2026-05-02 12:00:00',
            'end_at' => '2026-05-02 13:30:00',
            'type' => 'activity',
        ]);

        Media::create([
            'event_id' => $lunch1->id,
            'user_id' => $user->id,
            'type' => 'photo',
            'file_name' => 'buffet-da-pepi-interior.jpg',
            'file_path' => 'https://picsum.photos/seed/pepi1/800/600',
            'mime_type' => 'image/jpeg',
            'size_bytes' => 318000,
        ]);

        $museum = Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Museo Revoltella',
            'description' => 'Trieste\'s modern art museum housed in a 19th-century palazzo. The rooftop terrace has sweeping harbour views.',
            'location' => 'Via Armando Diaz 27, Trieste',
            'start_at' => '2026-05-02 14:30:00',
            'end_at' => '2026-05-02 17:00:00',
            'type' => 'activity',
        ]);

        foreach (['museum1', 'museum2', 'museum3'] as $seed) {
            Media::create([
                'event_id' => $museum->id,
                'user_id' => $user->id,
                'type' => 'photo',
                'file_name' => "{$seed}.jpg",
                'file_path' => "https://picsum.photos/seed/{$seed}/800/600",
                'mime_type' => 'image/jpeg',
                'size_bytes' => rand(280000, 420000),
            ]);
        }

        // Museum entry ticket
        Media::create([
            'event_id' => $museum->id,
            'user_id' => $user->id,
            'type' => 'document',
            'file_name' => 'museo-revoltella-tickets.pdf',
            'file_path' => 'https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table-word.jpg', // placeholder
            'mime_type' => 'application/pdf',
            'size_bytes' => 89400,
        ]);

        $dinner = Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Dinner at La Bottega del Vino',
            'description' => 'Intimate enoteca with a great Friulian wine list. Book the baccalà and finish with a glass of Ribolla Gialla.',
            'location' => 'Via Valdirivo 14, Trieste',
            'start_at' => '2026-05-02 20:00:00',
            'end_at' => '2026-05-02 22:30:00',
            'type' => 'activity',
        ]);

        foreach (['dinner1', 'dinner2'] as $seed) {
            Media::create([
                'event_id' => $dinner->id,
                'user_id' => $user->id,
                'type' => 'photo',
                'file_name' => "{$seed}.jpg",
                'file_path' => "https://picsum.photos/seed/{$seed}/800/600",
                'mime_type' => 'image/jpeg',
                'size_bytes' => rand(260000, 380000),
            ]);
        }

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

        $castle = Event::create([
            'itinerary_id' => $itinerary->id,
            'title' => 'Castello di Miramare',
            'description' => 'Romantic 19th-century castle built for Archduke Maximilian. Walk the clifftop gardens before the crowds arrive.',
            'location' => 'Viale Miramare, Trieste',
            'start_at' => '2026-05-03 10:30:00',
            'end_at' => '2026-05-03 13:00:00',
            'type' => 'activity',
        ]);

        foreach (['castle1', 'castle2', 'castle3', 'castle4'] as $seed) {
            Media::create([
                'event_id' => $castle->id,
                'user_id' => $user->id,
                'type' => 'photo',
                'file_name' => "{$seed}.jpg",
                'file_path' => "https://picsum.photos/seed/{$seed}/800/600",
                'mime_type' => 'image/jpeg',
                'size_bytes' => rand(300000, 450000),
            ]);
        }

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
