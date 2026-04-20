<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function callback()
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        $allowedEmails = ['changangus2@gmail.com', 'anniesmunro@gmail.com'];

        if (!in_array($googleUser->getEmail(), $allowedEmails)) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            return redirect("{$frontendUrl}/login?error=unauthorized");
        }

        $user = User::firstOrCreate(
            ['email' => $googleUser->getEmail()],
            [
                'name' => $googleUser->getName(),
                'email_verified_at' => now(),
                'password' => null,
            ]
        );

        $token = $user->createToken('auth_token')->plainTextToken;
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');

        return redirect("{$frontendUrl}/auth/callback?token=" . urlencode($token));
    }
}
