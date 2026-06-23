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
        return WishlistItem::query()
            ->with('creator:id,name')
            ->orderBy('type')
            ->orderBy('title')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $this->validateItem($request);
        $data['created_by'] = $request->user()->id;

        return response()->json(
            WishlistItem::query()->create($data)->load('creator:id,name'),
            201,
        );
    }

    public function update(Request $request, WishlistItem $wishlistItem)
    {
        $wishlistItem->update($this->validateItem($request));

        return $wishlistItem->fresh()->load('creator:id,name');
    }

    public function destroy(WishlistItem $wishlistItem)
    {
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
}
