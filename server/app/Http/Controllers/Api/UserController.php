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
        return User::query()->orderBy('name')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'username' => ['required', 'string', 'max:50', 'alpha_dash', 'unique:users,username'],
            'password' => ['required', Password::min(8)],
            'role' => ['required', Rule::in(['admin', 'member', 'viewer'])],
        ]);

        return response()->json(User::query()->create($data), 201);
    }

    public function update(Request $request, User $user)
    {
        abort_if($request->user()->is($user), 422, 'You cannot change your own role.');
        $data = $request->validate([
            'role' => ['required', Rule::in(['admin', 'member', 'viewer'])],
        ]);
        $user->update($data);

        return $user->fresh();
    }
}
