<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_reminder_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calendar_event_reminder_id')->constrained()->cascadeOnDelete();
            $table->foreignId('push_subscription_id')->constrained()->cascadeOnDelete();
            $table->dateTime('scheduled_at');
            $table->dateTime('sent_at')->nullable();
            $table->dateTime('failed_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamps();

            $table->unique(
                ['calendar_event_reminder_id', 'push_subscription_id', 'scheduled_at'],
                'calendar_reminder_delivery_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_reminder_deliveries');
    }
};
