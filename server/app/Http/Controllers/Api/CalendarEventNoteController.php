<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use Illuminate\Http\Request;

class CalendarEventNoteController extends Controller
{
    public function store(Request $request, CalendarEvent $calendarEvent)
    {
        abort_unless($request->user()->household_id === $calendarEvent->household_id, 404);

        $data = $request->validate([
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $note = $calendarEvent->eventNotes()->create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($note->load('author:id,name'), 201);
    }
}
