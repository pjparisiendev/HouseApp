<?php

namespace App\Models\Concerns;

use App\Models\Media;

trait HasMedia
{
    protected static function bootHasMedia(): void
    {
        static::deleting(function ($model): void {
            $model->media()->get()->each->delete();
        });
    }

    public function media()
    {
        return $this->morphMany(Media::class, 'mediable')
            ->orderByDesc('is_primary')
            ->orderBy('position')
            ->orderBy('id');
    }
}
