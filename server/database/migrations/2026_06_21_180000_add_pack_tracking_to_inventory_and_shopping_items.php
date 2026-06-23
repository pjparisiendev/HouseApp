<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->boolean('sub_quantity_enabled')->default(false);
            $table->unsignedInteger('units_per_pack')->default(1);
            $table->string('unit_label', 30)->nullable();
            $table->string('pack_label', 30)->nullable();
            $table->string('low_stock_threshold_mode', 10)->default('unit');
        });

        Schema::table('shopping_items', function (Blueprint $table) {
            $table->string('purchase_unit', 10)->default('unit');
            $table->unsignedInteger('units_per_purchase')->default(1);
            $table->string('purchase_label', 30)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('shopping_items', function (Blueprint $table) {
            $table->dropColumn(['purchase_unit', 'units_per_purchase', 'purchase_label']);
        });

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn([
                'sub_quantity_enabled',
                'units_per_pack',
                'unit_label',
                'pack_label',
                'low_stock_threshold_mode',
            ]);
        });
    }
};
