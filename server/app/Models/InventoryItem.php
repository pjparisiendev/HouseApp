<?php

namespace App\Models;

use App\Models\Concerns\HasMedia;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'inventory_category_id',
    'household_id',
    'name',
    'quantity',
    'price',
    'low_stock_threshold',
    'sub_quantity_enabled',
    'units_per_pack',
    'unit_label',
    'pack_label',
    'low_stock_threshold_mode',
])]
class InventoryItem extends Model
{
    use HasMedia;

    protected function casts(): array
    {
        return ['sub_quantity_enabled' => 'boolean'];
    }

    public function lowStockThresholdInUnits(): int
    {
        if ($this->sub_quantity_enabled && $this->low_stock_threshold_mode === 'pack') {
            return $this->low_stock_threshold * $this->units_per_pack;
        }

        return $this->low_stock_threshold;
    }

    public function category()
    {
        return $this->belongsTo(InventoryCategory::class, 'inventory_category_id');
    }

    public function shoppingItems()
    {
        return $this->hasMany(ShoppingItem::class);
    }
}
