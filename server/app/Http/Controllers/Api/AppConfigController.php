<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class AppConfigController extends Controller
{
    public function maps()
    {
        return [
            'google_maps_api_key' => config('services.google_maps.browser_key'),
        ];
    }
}
