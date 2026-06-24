<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Household;
use App\Models\InventoryItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class HouseholdController extends Controller
{
    public function index()
    {
        return Household::query()
            ->select(['id', 'name', 'created_at'])
            ->withCount('users')
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'admin_name' => ['required', 'string', 'max:100'],
            'admin_username' => [
                'required',
                'string',
                'max:50',
                'alpha_dash',
                Rule::unique('users', 'username'),
            ],
            'admin_password' => ['required', Password::min(8)],
        ]);

        return DB::transaction(function () use ($request, $data) {
            $household = Household::query()->create([
                'name' => $data['name'],
                'created_by' => $request->user()->id,
            ]);

            $admin = User::query()->create([
                'household_id' => $household->id,
                'name' => $data['admin_name'],
                'username' => $data['admin_username'],
                'password' => $data['admin_password'],
                'role' => 'admin',
                'is_platform_owner' => false,
            ]);

            foreach (['None', 'Fridge', 'Pantry', 'Household items'] as $category) {
                $household->inventoryCategories()->create(['name' => $category]);
            }

            return response()->json([
                'id' => $household->id,
                'name' => $household->name,
                'created_at' => $household->created_at,
                'users_count' => 1,
                'initial_admin' => $admin->only(['id', 'name', 'username', 'role']),
            ], 201);
        });
    }

    public function destroy(Request $request, Household $household)
    {
        abort_if($request->user()->household_id === $household->id, 422, 'You cannot delete your own household.');
        abort_if($household->users()->where('is_platform_owner', true)->exists(), 403);

        DB::transaction(function () use ($household) {
            InventoryItem::query()
                ->where('household_id', $household->id)
                ->get()
                ->each
                ->delete();

            $household->users()->delete();
            $household->delete();
        });

        return response()->noContent();
    }
}
