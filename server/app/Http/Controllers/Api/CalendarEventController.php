<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CalendarEventController extends Controller
{
    public function index()
    {
        return CalendarEvent::query()
            ->with(['creator:id,name', 'eventNotes.author:id,name'])
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validateEvent($request);
        $data['created_by'] = $request->user()->id;

        return response()->json(
            CalendarEvent::query()->create($data)->load(['creator:id,name', 'eventNotes.author:id,name']),
            201,
        );
    }

    public function update(Request $request, CalendarEvent $calendarEvent)
    {
        $calendarEvent->update($this->validateEvent($request));

        return $calendarEvent->fresh()->load(['creator:id,name', 'eventNotes.author:id,name']);
    }

    public function destroy(CalendarEvent $calendarEvent)
    {
        $calendarEvent->delete();

        return response()->noContent();
    }

    private function validateEvent(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'event_date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after_or_equal:start_time'],
            'category' => ['required', Rule::in(['home', 'appointment', 'reminder', 'social'])],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);
    }
}
