<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['title', 'type', 'notes', 'url', 'created_by'])]
class WishlistItem extends Model
{
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
