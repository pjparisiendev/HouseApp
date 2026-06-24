<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index()
    {
        return User::query()
            ->where('household_id', request()->user()->household_id)
            ->orderBy('name')
            ->get();
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->household_id, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:users,username'],
            'password' => ['required', Password::min(8)],
            'role' => ['required', Rule::in(['admin', 'member', 'viewer'])],
        ]);
        $data['household_id'] = $request->user()->household_id;
        $data['is_platform_owner'] = false;

        return response()->json(User::query()->create($data)->load('household:id,name'), 201);
    }

    public function update(Request $request, User $user)
    {
        abort_if($request->user()->is($user), 422, 'You cannot change your own role.');
        abort_unless($request->user()->household_id && $request->user()->household_id === $user->household_id, 404);

        $data = $request->validate([
            'role' => ['required', Rule::in(['admin', 'member', 'viewer'])],
        ]);
        $user->update($data);

        return $user->fresh()->load('household:id,name');
    }

    public function destroy(Request $request, User $user)
    {
        abort_if($request->user()->is($user), 422, 'You cannot delete yourself.');
        abort_if($user->is_platform_owner, 403);
        abort_unless($request->user()->household_id && $request->user()->household_id === $user->household_id, 404);

        if ($user->role === 'admin') {
            $otherAdmins = User::query()
                ->where('household_id', $user->household_id)
                ->where('role', 'admin')
                ->whereKeyNot($user->id)
                ->exists();

            abort_unless($otherAdmins, 422, 'A household must keep at least one admin.');
        }

        $user->delete();

        return response()->noContent();
    }
}
