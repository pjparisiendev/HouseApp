<?php

namespace Database\Seeders;

use App\Models\Household;
use App\Models\InventoryCategory;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $adminUsername = env('HOUSEAPP_ADMIN_USERNAME', 'pj');
        $household = Household::query()->firstOrCreate(
            ['name' => env('HOUSEAPP_PRIMARY_HOUSEHOLD_NAME', 'PJ Household')],
        );

        User::query()->updateOrCreate(
            ['username' => $adminUsername],
            [
                'household_id' => $household->id,
                'name' => env('HOUSEAPP_ADMIN_NAME', 'PJ'),
                'password' => env('HOUSEAPP_ADMIN_PASSWORD', 'houseapp-demo'),
                'role' => 'admin',
                'is_platform_owner' => true,
            ],
        );

        foreach (['None', 'Fridge', 'Pantry', 'Household items'] as $category) {
            InventoryCategory::query()->firstOrCreate([
                'household_id' => $household->id,
                'name' => $category,
            ]);
        }
    }
}
