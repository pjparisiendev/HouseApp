<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_event_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calendar_event_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('minutes_before');
            $table->timestamps();

            $table->unique(['calendar_event_id', 'minutes_before']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_event_reminders');
    }
};
