<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            $table->string('location_name')->nullable()->after('category');
            $table->string('location_url', 1000)->nullable()->after('location_name');
            $table->string('location_place_id')->nullable()->after('location_url');
            $table->decimal('location_lat', 10, 7)->nullable()->after('location_place_id');
            $table->decimal('location_lng', 10, 7)->nullable()->after('location_lat');
        });
    }

    public function down(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            $table->dropColumn([
                'location_name',
                'location_url',
                'location_place_id',
                'location_lat',
                'location_lng',
            ]);
        });
    }
};
