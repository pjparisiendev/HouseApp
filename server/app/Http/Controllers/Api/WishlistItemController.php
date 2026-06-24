<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WishlistItem;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WishlistItemController extends Controller
{
    private const TYPES = ['thing', 'activity', 'trip', 'place', 'book', 'other'];

    public function index()
    {
        abort_unless(request()->user()->household_id, 403);

        return WishlistItem::query()
            ->where('household_id', request()->user()->household_id)
            ->with('creator:id,name')
            ->orderBy('type')
            ->orderBy('title')
            ->get();
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->household_id, 403);

        $data = $this->validateItem($request);
        $data['household_id'] = $request->user()->household_id;
        $data['created_by'] = $request->user()->id;

        return response()->json(
            WishlistItem::query()->create($data)->load('creator:id,name'),
            201,
        );
    }

    public function update(Request $request, WishlistItem $wishlistItem)
    {
        $this->authorizeHousehold($request, $wishlistItem);

        $wishlistItem->update($this->validateItem($request));

        return $wishlistItem->fresh()->load('creator:id,name');
    }

    public function destroy(WishlistItem $wishlistItem)
    {
        abort_unless(request()->user()->household_id === $wishlistItem->household_id, 404);

        $wishlistItem->delete();

        return response()->noContent();
    }

    private function validateItem(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'type' => ['required', Rule::in(self::TYPES)],
            'notes' => ['nullable', 'string', 'max:5000'],
            'url' => ['nullable', 'url:http,https', 'max:2048'],
        ]);
    }

    private function authorizeHousehold(Request $request, WishlistItem $wishlistItem): void
    {
        abort_unless($request->user()->household_id === $wishlistItem->household_id, 404);
    }
}
