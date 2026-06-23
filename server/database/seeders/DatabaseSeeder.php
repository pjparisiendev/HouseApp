<?php

namespace Database\Seeders;

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
        User::query()->updateOrCreate(
            ['username' => env('HOUSEAPP_ADMIN_USERNAME', 'pj')],
            [
                'name' => env('HOUSEAPP_ADMIN_NAME', 'PJ'),
                'password' => env('HOUSEAPP_ADMIN_PASSWORD', 'houseapp-demo'),
                'role' => 'admin',
            ],
        );

        foreach (['None', 'Fridge', 'Pantry', 'Household items'] as $category) {
            InventoryCategory::query()->firstOrCreate(['name' => $category]);
        }
    }
}
