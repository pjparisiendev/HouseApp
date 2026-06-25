<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\ShoppingItem;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ShoppingItemController extends Controller
{
    public function __construct(private readonly InventoryService $inventoryService) {}

    public function index()
    {
        abort_unless(request()->user()->household_id, 403);

        return ShoppingItem::query()
            ->where('household_id', request()->user()->household_id)
            ->with('category')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->household_id, 403);

        $data = $this->validateItem($request);
        $inventoryItem = InventoryItem::query()
            ->where('household_id', $request->user()->household_id)
            ->where('inventory_category_id', $data['inventory_category_id'])
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($data['name'])])
            ->first();
        $this->updateInventorySettings($inventoryItem, $data);
        [$purchaseUnit, $unitsPerPurchase, $purchaseLabel] = $this->purchaseSettings($inventoryItem, $data);
        $existing = ShoppingItem::query()
            ->where('household_id', $request->user()->household_id)
            ->where('inventory_category_id', $data['inventory_category_id'])
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($data['name'])])
            ->where('purchase_unit', $purchaseUnit)
            ->where('units_per_purchase', $unitsPerPurchase)
            ->first();

        if ($existing) {
            $existing->increment('quantity', $data['quantity']);
            $existing->update([
                'automatic' => false,
                'price' => $inventoryItem?->price ?? ($data['price'] ?? $existing->price),
                'purchase_label' => $purchaseLabel,
                ...$this->pendingSettings($inventoryItem, $data),
            ]);

            return $existing->fresh()->load('category');
        }

        $data = [
            ...$this->shoppingData($data),
            ...$this->pendingSettings($inventoryItem, $data),
            'household_id' => $request->user()->household_id,
            'inventory_item_id' => $inventoryItem?->id,
            'automatic' => false,
            'price' => $inventoryItem?->price ?? ($data['price'] ?? null),
            'purchase_unit' => $purchaseUnit,
            'units_per_purchase' => $unitsPerPurchase,
            'purchase_label' => $purchaseLabel,
        ];

        return response()->json(ShoppingItem::query()->create($data)->load('category'), 201);
    }

    public function update(Request $request, ShoppingItem $shoppingItem)
    {
        $this->authorizeHousehold($request, $shoppingItem);

        if ($request->keys() === ['quantity']) {
            $data = $request->validate(['quantity' => ['required', 'integer', 'min:1']]);
            $shoppingItem->update($data);

            return $shoppingItem->fresh()->load('category');
        }

        $data = $this->validateItem($request);
        $inventoryItem = InventoryItem::query()
            ->where('household_id', $request->user()->household_id)
            ->where('inventory_category_id', $data['inventory_category_id'])
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($data['name'])])
            ->first();
        $this->updateInventorySettings($inventoryItem, $data);
        [$purchaseUnit, $unitsPerPurchase, $purchaseLabel] = $this->purchaseSettings($inventoryItem, $data);
        $shoppingItem->update([
            ...$this->shoppingData($data),
            ...$this->pendingSettings($inventoryItem, $data),
            'inventory_item_id' => $inventoryItem?->id,
            'automatic' => false,
            'price' => $inventoryItem?->price ?? ($data['price'] ?? null),
            'purchase_unit' => $purchaseUnit,
            'units_per_purchase' => $unitsPerPurchase,
            'purchase_label' => $purchaseLabel,
        ]);

        return $shoppingItem->fresh()->load('category');
    }

    public function destroy(ShoppingItem $shoppingItem)
    {
        abort_unless(request()->user()->household_id === $shoppingItem->household_id, 404);

        $shoppingItem->delete();

        return response()->noContent();
    }

    public function acquire(ShoppingItem $shoppingItem)
    {
        abort_unless(request()->user()->household_id === $shoppingItem->household_id, 404);

        return response()->json($this->inventoryService->acquire($shoppingItem));
    }

    private function authorizeHousehold(Request $request, ShoppingItem $shoppingItem): void
    {
        abort_unless($request->user()->household_id === $shoppingItem->household_id, 404);
    }

    private function shoppingData(array $data): array
    {
        return [
            'name' => $data['name'],
            'inventory_category_id' => $data['inventory_category_id'],
            'quantity' => $data['quantity'],
            'price' => $data['price'] ?? null,
        ];
    }

    private function validateItem(Request $request): array
    {
        $enabled = $request->boolean('sub_quantity_enabled');

        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'inventory_category_id' => [
                'required',
                Rule::exists('inventory_categories', 'id')
                    ->where('household_id', $request->user()->household_id),
            ],
            'quantity' => ['required', 'integer', 'min:1'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'low_stock_threshold' => ['nullable', 'integer', 'min:0'],
            'sub_quantity_enabled' => ['nullable', 'boolean'],
            'units_per_pack' => $enabled
                ? ['required', 'integer', 'min:2']
                : ['nullable', 'integer', 'min:1'],
            'unit_label' => [$enabled ? 'required' : 'nullable', 'string', 'max:30'],
            'pack_label' => [$enabled ? 'required' : 'nullable', 'string', 'max:30'],
            'low_stock_threshold_mode' => [
                'nullable',
                Rule::in($enabled ? ['unit', 'pack'] : ['unit']),
            ],
        ]);
    }

    private function updateInventorySettings(?InventoryItem $inventoryItem, array $data): void
    {
        if (! $inventoryItem) {
            return;
        }

        $enabled = (bool) ($data['sub_quantity_enabled'] ?? $inventoryItem->sub_quantity_enabled);
        $inventoryItem->update([
            'price' => $data['price'] ?? $inventoryItem->price,
            'low_stock_threshold' => $data['low_stock_threshold'] ?? $inventoryItem->low_stock_threshold,
            'sub_quantity_enabled' => $enabled,
            'units_per_pack' => $enabled ? ($data['units_per_pack'] ?? $inventoryItem->units_per_pack) : 1,
            'unit_label' => $enabled ? ($data['unit_label'] ?? $inventoryItem->unit_label) : null,
            'pack_label' => $enabled ? ($data['pack_label'] ?? $inventoryItem->pack_label) : null,
            'low_stock_threshold_mode' => $enabled
                ? ($data['low_stock_threshold_mode'] ?? $inventoryItem->low_stock_threshold_mode)
                : 'unit',
        ]);
        $this->inventoryService->syncLowStock($inventoryItem->fresh());
    }

    private function purchaseSettings(?InventoryItem $inventoryItem, array $data): array
    {
        $packEnabled = $inventoryItem?->sub_quantity_enabled || (bool) ($data['sub_quantity_enabled'] ?? false);

        if (! $packEnabled) {
            return ['unit', 1, null];
        }

        return [
            'pack',
            $inventoryItem?->units_per_pack ?? $data['units_per_pack'],
            $inventoryItem?->pack_label ?? $data['pack_label'],
        ];
    }

    private function pendingSettings(?InventoryItem $inventoryItem, array $data): array
    {
        if ($inventoryItem) {
            return [
                'pending_low_stock_threshold' => 0,
                'pending_sub_quantity_enabled' => false,
                'pending_units_per_pack' => 1,
                'pending_unit_label' => null,
                'pending_pack_label' => null,
                'pending_low_stock_threshold_mode' => 'unit',
            ];
        }

        $enabled = (bool) ($data['sub_quantity_enabled'] ?? false);

        return [
            'pending_low_stock_threshold' => $data['low_stock_threshold'] ?? 0,
            'pending_sub_quantity_enabled' => $enabled,
            'pending_units_per_pack' => $enabled ? $data['units_per_pack'] : 1,
            'pending_unit_label' => $enabled ? $data['unit_label'] : null,
            'pending_pack_label' => $enabled ? $data['pack_label'] : null,
            'pending_low_stock_threshold_mode' => $enabled
                ? ($data['low_stock_threshold_mode'] ?? 'unit')
                : 'unit',
        ];
    }
}
