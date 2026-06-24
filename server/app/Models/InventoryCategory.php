<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['household_id', 'name', 'created_by'])]
class InventoryCategory extends Model
{
    public function items()
    {
        return $this->hasMany(InventoryItem::class);
    }

    public function shoppingItems()
    {
        return $this->hasMany(ShoppingItem::class);
    }
}
