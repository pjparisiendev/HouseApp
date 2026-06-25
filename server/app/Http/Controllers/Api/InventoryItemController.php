<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Services\InventoryService;
use App\Services\MediaService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryItemController extends Controller
{
    public function __construct(
        private readonly InventoryService $inventoryService,
        private readonly MediaService $mediaService,
    ) {}

    public function index()
    {
        abort_unless(request()->user()->household_id, 403);

        return InventoryItem::query()
            ->where('household_id', request()->user()->household_id)
            ->with(['category', 'media'])
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->household_id, 403);

        $data = $this->validateItem($request, enforceUnique: false);
        $data['household_id'] = $request->user()->household_id;
        $item = InventoryItem::query()
            ->where('household_id', $request->user()->household_id)
            ->where('inventory_category_id', $data['inventory_category_id'])
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($data['name'])])
            ->first();

        if ($item) {
            $item->update($data);
        } else {
            $item = InventoryItem::query()->create($data);
        }

        $this->inventoryService->syncLowStock($item);

        return response()->json($item->load(['category', 'media']), $item->wasRecentlyCreated ? 201 : 200);
    }

    public function update(Request $request, InventoryItem $inventoryItem)
    {
        $this->authorizeHousehold($request, $inventoryItem);

        $inventoryItem->update($this->validateItem($request, $inventoryItem));
        $this->inventoryService->syncLowStock($inventoryItem);

        return $inventoryItem->fresh()->load(['category', 'media']);
    }

    public function destroy(InventoryItem $inventoryItem)
    {
        abort_unless(request()->user()->household_id === $inventoryItem->household_id, 404);

        $inventoryItem->shoppingItems()->where('automatic', true)->delete();
        $inventoryItem->shoppingItems()->update(['inventory_item_id' => null]);
        $inventoryItem->delete();

        return response()->noContent();
    }

    public function uploadMedia(Request $request, InventoryItem $inventoryItem)
    {
        $this->authorizeHousehold($request, $inventoryItem);

        $data = $request->validate([
            'image' => [
                'required',
                'file',
                'mimes:jpg,jpeg,webp',
                'max:2048',
            ],
            'original_name' => ['required', 'string', 'max:255'],
        ]);

        $this->mediaService->store(
            $inventoryItem,
            $request->file('image'),
            $request->user(),
            $data['original_name'],
            limit: 5,
        );

        return $inventoryItem->fresh()->load(['category', 'media']);
    }

    private function validateItem(
        Request $request,
        ?InventoryItem $inventoryItem = null,
        bool $enforceUnique = true,
    ): array {
        $enabled = $request->boolean('sub_quantity_enabled');
        $nameRules = ['required', 'string', 'max:100'];

        if ($enforceUnique) {
            $nameRules[] = Rule::unique('inventory_items')->where(
                fn ($query) => $query
                    ->where('household_id', $request->user()->household_id)
                    ->where('inventory_category_id', $request->input('inventory_category_id')),
            )->ignore($inventoryItem);
        }

        $data = $request->validate([
            'name' => $nameRules,
            'inventory_category_id' => [
                'required',
                Rule::exists('inventory_categories', 'id')
                    ->where('household_id', $request->user()->household_id),
            ],
            'quantity' => ['required', 'integer', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'low_stock_threshold' => ['required', 'integer', 'min:0'],
            'sub_quantity_enabled' => ['sometimes', 'boolean'],
            'units_per_pack' => $enabled
                ? ['required', 'integer', 'min:2']
                : ['nullable', 'integer'],
            'unit_label' => [$enabled ? 'required' : 'nullable', 'string', 'max:30'],
            'pack_label' => [$enabled ? 'required' : 'nullable', 'string', 'max:30'],
            'low_stock_threshold_mode' => [
                'nullable',
                Rule::in($enabled ? ['unit', 'pack'] : ['unit']),
            ],
        ]);

        return [
            ...$data,
            'sub_quantity_enabled' => $enabled,
            'units_per_pack' => $enabled ? $data['units_per_pack'] : 1,
            'unit_label' => $enabled ? $data['unit_label'] : null,
            'pack_label' => $enabled ? $data['pack_label'] : null,
            'low_stock_threshold_mode' => $enabled
                ? ($data['low_stock_threshold_mode'] ?? 'unit')
                : 'unit',
        ];
    }

    private function authorizeHousehold(Request $request, InventoryItem $inventoryItem): void
    {
        abort_unless($request->user()->household_id === $inventoryItem->household_id, 404);
    }
}
