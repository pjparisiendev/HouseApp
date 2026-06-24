<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            if (! Schema::hasColumn('calendar_events', 'location_place_id')) {
                $table->string('location_place_id')->nullable()->after('location_url');
            }

            if (! Schema::hasColumn('calendar_events', 'location_lat')) {
                $table->decimal('location_lat', 10, 7)->nullable()->after('location_place_id');
            }

            if (! Schema::hasColumn('calendar_events', 'location_lng')) {
                $table->decimal('location_lng', 10, 7)->nullable()->after('location_lat');
            }
        });
    }

    public function down(): void
    {
        Schema::table('calendar_events', function (Blueprint $table) {
            foreach (['location_lng', 'location_lat', 'location_place_id'] as $column) {
                if (Schema::hasColumn('calendar_events', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
