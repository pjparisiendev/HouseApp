<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\ShoppingItem;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function syncLowStock(InventoryItem $inventoryItem): void
    {
        $shoppingItem = ShoppingItem::query()
            ->where('household_id', $inventoryItem->household_id)
            ->where('inventory_item_id', $inventoryItem->id)
            ->first();
        $threshold = $inventoryItem->lowStockThresholdInUnits();
        $isLow = $threshold > 0 && $inventoryItem->quantity < $threshold;
        $shortage = max(0, $threshold - $inventoryItem->quantity);
        $purchaseUnit = $inventoryItem->sub_quantity_enabled ? 'pack' : 'unit';
        $unitsPerPurchase = $inventoryItem->sub_quantity_enabled
            ? $inventoryItem->units_per_pack
            : 1;
        $purchaseQuantity = $inventoryItem->sub_quantity_enabled
            ? (int) ceil($shortage / $unitsPerPurchase)
            : $shortage;
        $purchaseLabel = $inventoryItem->sub_quantity_enabled
            ? $inventoryItem->pack_label
            : null;

        if ($isLow && ! $shoppingItem) {
            ShoppingItem::query()->create([
                'household_id' => $inventoryItem->household_id,
                'inventory_category_id' => $inventoryItem->inventory_category_id,
                'inventory_item_id' => $inventoryItem->id,
                'name' => $inventoryItem->name,
                'quantity' => $purchaseQuantity,
                'automatic' => true,
                'purchase_unit' => $purchaseUnit,
                'units_per_purchase' => $unitsPerPurchase,
                'purchase_label' => $purchaseLabel,
            ]);

            return;
        }

        if ($isLow && $shoppingItem?->automatic) {
            $shoppingItem->update([
                'inventory_category_id' => $inventoryItem->inventory_category_id,
                'name' => $inventoryItem->name,
                'quantity' => $purchaseQuantity,
                'purchase_unit' => $purchaseUnit,
                'units_per_purchase' => $unitsPerPurchase,
                'purchase_label' => $purchaseLabel,
            ]);
        } elseif (! $isLow && $shoppingItem?->automatic) {
            $shoppingItem->delete();
        }
    }

    public function acquire(ShoppingItem $shoppingItem): InventoryItem
    {
        return DB::transaction(function () use ($shoppingItem) {
            $inventoryItem = $shoppingItem->inventoryItem()
                ->lockForUpdate()
                ->first();

            if (! $inventoryItem) {
                $inventoryItem = InventoryItem::query()
                    ->where('household_id', $shoppingItem->household_id)
                    ->where('inventory_category_id', $shoppingItem->inventory_category_id)
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($shoppingItem->name)])
                    ->lockForUpdate()
                    ->first();
            }

            if ($inventoryItem) {
                $inventoryItem->increment(
                    'quantity',
                    $shoppingItem->quantity * $shoppingItem->units_per_purchase,
                );
                $inventoryItem->refresh();
            } else {
                $inventoryItem = InventoryItem::query()->create([
                    'household_id' => $shoppingItem->household_id,
                    'inventory_category_id' => $shoppingItem->inventory_category_id,
                    'name' => $shoppingItem->name,
                    'quantity' => $shoppingItem->quantity * $shoppingItem->units_per_purchase,
                    'low_stock_threshold' => 0,
                ]);
            }

            $shoppingItem->delete();
            $this->syncLowStock($inventoryItem);

            return $inventoryItem->load('category');
        });
    }
}
