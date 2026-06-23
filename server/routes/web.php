<?php

use Illuminate\Support\Facades\Route;

Route::get('/{path?}', function () {
    $app = public_path('app/index.html');

    abort_unless(file_exists($app), 503, 'HouseApp frontend has not been built.');

    return response()->file($app);
})->where('path', '.*');
