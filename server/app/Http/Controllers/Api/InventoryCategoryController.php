<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryCategoryController extends Controller
{
    public function index()
    {
        $householdId = request()->user()->household_id;
        abort_unless($householdId, 403);

        InventoryCategory::query()->firstOrCreate([
            'household_id' => $householdId,
            'name' => 'None',
        ]);

        return InventoryCategory::query()
            ->where('household_id', $householdId)
            ->orderByRaw("CASE WHEN name = 'None' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->household_id, 403);

        $data = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('inventory_categories', 'name')
                    ->where('household_id', $request->user()->household_id),
            ],
        ]);
        $data['household_id'] = $request->user()->household_id;
        $data['created_by'] = $request->user()->id;

        return response()->json(InventoryCategory::query()->create($data), 201);
    }
}
