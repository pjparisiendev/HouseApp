<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'inventory_category_id',
    'inventory_item_id',
    'household_id',
    'name',
    'quantity',
    'price',
    'automatic',
    'purchase_unit',
    'units_per_purchase',
    'purchase_label',
    'pending_low_stock_threshold',
    'pending_sub_quantity_enabled',
    'pending_units_per_pack',
    'pending_unit_label',
    'pending_pack_label',
    'pending_low_stock_threshold_mode',
])]
class ShoppingItem extends Model
{
    protected function casts(): array
    {
        return [
            'automatic' => 'boolean',
            'pending_sub_quantity_enabled' => 'boolean',
        ];
    }

    public function category()
    {
        return $this->belongsTo(InventoryCategory::class, 'inventory_category_id');
    }

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class);
    }
}
