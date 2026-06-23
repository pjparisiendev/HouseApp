<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['title', 'event_date', 'start_time', 'end_time', 'category', 'notes', 'created_by'])]
class CalendarEvent extends Model
{
    protected function casts(): array
    {
        return ['event_date' => 'date:Y-m-d'];
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function eventNotes()
    {
        return $this->hasMany(CalendarEventNote::class)->oldest();
    }
}
