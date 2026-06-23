<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['calendar_event_id', 'body', 'created_by'])]
class CalendarEventNote extends Model
{
    public function event()
    {
        return $this->belongsTo(CalendarEvent::class, 'calendar_event_id');
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
