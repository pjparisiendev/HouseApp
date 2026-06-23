<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryCategory;
use Illuminate\Http\Request;

class InventoryCategoryController extends Controller
{
    public function index()
    {
        InventoryCategory::query()->firstOrCreate(['name' => 'None']);

        return InventoryCategory::query()
            ->orderByRaw("CASE WHEN name = 'None' THEN 0 ELSE 1 END")
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:inventory_categories,name'],
        ]);
        $data['created_by'] = $request->user()->id;

        return response()->json(InventoryCategory::query()->create($data), 201);
    }
}
