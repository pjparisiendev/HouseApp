<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'type',
    'title',
    'description',
    'status',
    'priority',
    'source_path',
    'source_label',
    'created_by',
])]
class FeedbackItem extends Model
{
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
