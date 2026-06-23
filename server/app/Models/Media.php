<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

#[Fillable([
    'mediable_type',
    'mediable_id',
    'collection',
    'disk',
    'path',
    'mime_type',
    'byte_size',
    'width',
    'height',
    'position',
    'is_primary',
    'original_name',
    'created_by',
])]
class Media extends Model
{
    protected $table = 'media';

    protected $hidden = ['disk', 'path', 'mediable_type', 'mediable_id'];

    protected function casts(): array
    {
        return [
            'byte_size' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'position' => 'integer',
            'is_primary' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (Media $media): void {
            Storage::disk($media->disk)->delete($media->path);
        });
    }

    public function mediable()
    {
        return $this->morphTo();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
