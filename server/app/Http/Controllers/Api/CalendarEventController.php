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
        abort_unless(request()->user()->household_id, 403);

        return CalendarEvent::query()
            ->where('household_id', request()->user()->household_id)
            ->with(['creator:id,name', 'eventNotes.author:id,name', 'reminders'])
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->get();
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->household_id, 403);

        $data = $this->validateEvent($request);
        $reminders = $data['reminders'] ?? [];
        unset($data['reminders']);
        $data['household_id'] = $request->user()->household_id;
        $data['created_by'] = $request->user()->id;

        $calendarEvent = CalendarEvent::query()->create($data);
        $this->syncReminders($calendarEvent, $reminders);

        return response()->json(
            $calendarEvent->load(['creator:id,name', 'eventNotes.author:id,name', 'reminders']),
            201,
        );
    }

    public function update(Request $request, CalendarEvent $calendarEvent)
    {
        $this->authorizeHousehold($request, $calendarEvent);

        $data = $this->validateEvent($request);
        $reminders = $data['reminders'] ?? [];
        unset($data['reminders']);

        $calendarEvent->update($data);
        $this->syncReminders($calendarEvent, $reminders);

        return $calendarEvent->fresh()->load(['creator:id,name', 'eventNotes.author:id,name', 'reminders']);
    }

    public function destroy(CalendarEvent $calendarEvent)
    {
        abort_unless(request()->user()->household_id === $calendarEvent->household_id, 404);

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
            'location_name' => ['nullable', 'string', 'max:255'],
            'location_url' => ['nullable', 'url', 'max:1000'],
            'location_place_id' => ['nullable', 'string', 'max:255'],
            'location_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'location_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'reminders' => ['sometimes', 'array', 'max:10'],
            'reminders.*.minutes_before' => ['required', 'integer', 'min:0', 'max:43200'],
        ]);
    }

    private function syncReminders(CalendarEvent $calendarEvent, array $reminders): void
    {
        $minutes = collect($reminders)
            ->pluck('minutes_before')
            ->map(fn ($value) => (int) $value)
            ->unique()
            ->sortDesc()
            ->values();

        $calendarEvent->reminders()->delete();

        foreach ($minutes as $minutesBefore) {
            $calendarEvent->reminders()->create(['minutes_before' => $minutesBefore]);
        }
    }

    private function authorizeHousehold(Request $request, CalendarEvent $calendarEvent): void
    {
        abort_unless($request->user()->household_id === $calendarEvent->household_id, 404);
    }
}
