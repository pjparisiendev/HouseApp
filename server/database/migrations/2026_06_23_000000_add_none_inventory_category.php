<?php

use App\Models\InventoryCategory;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        InventoryCategory::query()->firstOrCreate(['name' => 'None']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        InventoryCategory::query()
            ->where('name', 'None')
            ->whereDoesntHave('items')
            ->whereDoesntHave('shoppingItems')
            ->delete();
    }
};
