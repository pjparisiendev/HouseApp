<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'inventory_category_id',
    'inventory_item_id',
    'name',
    'quantity',
    'automatic',
    'purchase_unit',
    'units_per_purchase',
    'purchase_label',
])]
class ShoppingItem extends Model
{
    protected function casts(): array
    {
        return ['automatic' => 'boolean'];
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
