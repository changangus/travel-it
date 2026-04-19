<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json(['app' => 'Travel-IT API', 'version' => '1.0']);
});
