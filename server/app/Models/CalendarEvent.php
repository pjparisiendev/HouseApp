<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'household_id',
    'title',
    'event_date',
    'start_time',
    'end_time',
    'category',
    'location_name',
    'location_url',
    'location_place_id',
    'location_lat',
    'location_lng',
    'notes',
    'created_by',
])]
class CalendarEvent extends Model
{
    protected function casts(): array
    {
        return [
            'event_date' => 'date:Y-m-d',
            'location_lat' => 'float',
            'location_lng' => 'float',
        ];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function eventNotes()
    {
        return $this->hasMany(CalendarEventNote::class)->oldest();
    }

    public function reminders()
    {
        return $this->hasMany(CalendarEventReminder::class)->orderByDesc('minutes_before');
    }
}
