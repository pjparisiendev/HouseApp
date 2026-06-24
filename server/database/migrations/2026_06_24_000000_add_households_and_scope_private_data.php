<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('households', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('household_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->boolean('is_platform_owner')->default(false)->after('role');
        });

        foreach (['inventory_categories', 'inventory_items', 'shopping_items', 'calendar_events', 'wishlist_items'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('household_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            });
        }

        $adminUsername = env('HOUSEAPP_ADMIN_USERNAME', 'pj');
        $adminId = DB::table('users')->where('username', $adminUsername)->value('id')
            ?? DB::table('users')->orderBy('id')->value('id');

        $householdId = DB::table('households')->insertGetId([
            'name' => env('HOUSEAPP_PRIMARY_HOUSEHOLD_NAME', 'PJ Household'),
            'created_by' => $adminId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('users')->update(['household_id' => $householdId]);

        if ($adminId) {
            DB::table('users')->where('id', $adminId)->update(['is_platform_owner' => true]);
        }

        foreach (['inventory_categories', 'inventory_items', 'shopping_items', 'calendar_events', 'wishlist_items'] as $tableName) {
            DB::table($tableName)->update(['household_id' => $householdId]);
        }
    }

    public function down(): void
    {
        foreach (['wishlist_items', 'calendar_events', 'shopping_items', 'inventory_items', 'inventory_categories'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('household_id');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('household_id');
            $table->dropColumn('is_platform_owner');
        });

        Schema::dropIfExists('households');
    }
};
