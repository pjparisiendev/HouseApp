<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['calendar_event_id', 'minutes_before'])]
class CalendarEventReminder extends Model
{
    public function calendarEvent()
    {
        return $this->belongsTo(CalendarEvent::class);
    }
}
