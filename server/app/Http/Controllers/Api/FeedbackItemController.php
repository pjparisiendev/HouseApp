<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeedbackItem;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeedbackItemController extends Controller
{
    private const TYPES = ['bug', 'feature', 'improvement', 'other'];

    private const STATUSES = ['new', 'reviewing', 'planned', 'done', 'declined'];

    private const PRIORITIES = ['low', 'normal', 'high'];

    public function index()
    {
        $items = FeedbackItem::query()
            ->with('creator:id,name')
            ->orderByRaw("CASE WHEN status IN ('done', 'declined') THEN 1 ELSE 0 END")
            ->latest()
            ->get();

        return $this->presentItems($items);
    }

    public function store(Request $request)
    {
        $data = $this->validateItem($request, admin: false);
        $data['created_by'] = $request->user()->id;
        $data['status'] = 'new';
        $data['priority'] = $data['priority'] ?? 'normal';

        return response()->json($this->presentItem(
            FeedbackItem::query()->create($data)->load('creator:id,name'),
            $request,
        ), 201);
    }

    public function update(Request $request, FeedbackItem $feedbackItem)
    {
        $feedbackItem->update($this->validateItem($request, admin: true));

        return $this->presentItem($feedbackItem->fresh()->load('creator:id,name'), $request);
    }

    public function destroy(FeedbackItem $feedbackItem)
    {
        $feedbackItem->delete();

        return response()->noContent();
    }

    private function validateItem(Request $request, bool $admin): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(self::TYPES)],
            'title' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:5000'],
            'priority' => [$admin ? 'required' : 'nullable', Rule::in(self::PRIORITIES)],
            'status' => [$admin ? 'required' : 'exclude', Rule::in(self::STATUSES)],
            'source_path' => [$admin ? 'exclude' : 'nullable', 'string', 'max:255'],
            'source_label' => [$admin ? 'exclude' : 'nullable', 'string', 'max:100'],
        ]);
    }

    private function presentItems($items)
    {
        return $items->map(fn (FeedbackItem $item) => $this->presentItem($item, request()))->values();
    }

    private function presentItem(FeedbackItem $item, Request $request): array
    {
        $data = $item->toArray();
        unset($data['created_by']);
        $data['creator'] = $request->user()->is_platform_owner
            ? $item->creator?->only(['id', 'name'])
            : ['name' => 'HouseApp user'];

        return $data;
    }
}
