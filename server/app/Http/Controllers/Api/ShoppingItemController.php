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

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'inventory_category_id' => [
                'required',
                Rule::exists('inventory_categories', 'id')
                    ->where('household_id', $request->user()->household_id),
            ],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);
        $inventoryItem = InventoryItem::query()
            ->where('household_id', $request->user()->household_id)
            ->where('inventory_category_id', $data['inventory_category_id'])
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($data['name'])])
            ->first();
        $purchaseUnit = $inventoryItem?->sub_quantity_enabled ? 'pack' : 'unit';
        $unitsPerPurchase = $inventoryItem?->sub_quantity_enabled
            ? $inventoryItem->units_per_pack
            : 1;
        $purchaseLabel = $inventoryItem?->sub_quantity_enabled
            ? $inventoryItem->pack_label
            : null;
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
                'purchase_label' => $purchaseLabel,
            ]);

            return $existing->fresh()->load('category');
        }

        $data['household_id'] = $request->user()->household_id;
        $data['inventory_item_id'] = $inventoryItem?->id;
        $data['automatic'] = false;
        $data['purchase_unit'] = $purchaseUnit;
        $data['units_per_purchase'] = $unitsPerPurchase;
        $data['purchase_label'] = $purchaseLabel;

        return response()->json(ShoppingItem::query()->create($data)->load('category'), 201);
    }

    public function update(Request $request, ShoppingItem $shoppingItem)
    {
        $this->authorizeHousehold($request, $shoppingItem);

        $data = $request->validate(['quantity' => ['required', 'integer', 'min:1']]);
        $shoppingItem->update($data);

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
}
