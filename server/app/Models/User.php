<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['household_id', 'name', 'username', 'password', 'role', 'is_platform_owner'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const ROLE_PERMISSIONS = [
        'admin' => ['manage_users', 'manage_roles', 'edit_household'],
        'member' => ['edit_household'],
        'viewer' => [],
    ];

    public function hasPermission(string $permission): bool
    {
        if ($this->is_platform_owner && in_array($permission, ['manage_households', 'manage_feedback'], true)) {
            return true;
        }

        return in_array($permission, self::ROLE_PERMISSIONS[$this->role] ?? [], true);
    }

    public function household()
    {
        return $this->belongsTo(Household::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_platform_owner' => 'boolean',
        ];
    }
}
