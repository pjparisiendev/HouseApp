<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shopping_items', function (Blueprint $table) {
            $table->unsignedInteger('pending_low_stock_threshold')->default(0);
            $table->boolean('pending_sub_quantity_enabled')->default(false);
            $table->unsignedInteger('pending_units_per_pack')->default(1);
            $table->string('pending_unit_label', 30)->nullable();
            $table->string('pending_pack_label', 30)->nullable();
            $table->string('pending_low_stock_threshold_mode', 10)->default('unit');
        });
    }

    public function down(): void
    {
        Schema::table('shopping_items', function (Blueprint $table) {
            $table->dropColumn([
                'pending_low_stock_threshold',
                'pending_sub_quantity_enabled',
                'pending_units_per_pack',
                'pending_unit_label',
                'pending_pack_label',
                'pending_low_stock_threshold_mode',
            ]);
        });
    }
};
