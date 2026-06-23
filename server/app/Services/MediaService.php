<?php

namespace App\Services;

use App\Models\Media;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class MediaService
{
    public function store(
        Model $mediable,
        UploadedFile $file,
        User $creator,
        string $originalName,
        string $collection = 'images',
        int $limit = 5,
    ): Media {
        $dimensions = @getimagesize($file->getRealPath());
        if (! $dimensions) {
            throw ValidationException::withMessages(['image' => 'The uploaded file is not a valid image.']);
        }
        if ($dimensions[0] > 1600 || $dimensions[1] > 1600) {
            throw ValidationException::withMessages([
                'image' => 'Processed images cannot be larger than 1600 pixels.',
            ]);
        }

        return DB::transaction(function () use (
            $mediable,
            $file,
            $creator,
            $originalName,
            $collection,
            $limit,
            $dimensions,
        ): Media {
            $existing = $mediable->media()
                ->where('collection', $collection)
                ->lockForUpdate()
                ->get();
            if ($existing->count() >= $limit) {
                throw ValidationException::withMessages([
                    'image' => "Only {$limit} images are allowed.",
                ]);
            }

            $extension = $file->getMimeType() === 'image/webp' ? 'webp' : 'jpg';
            $directory = 'media/'.$mediable->getTable().'/'.$mediable->getKey();
            $path = $directory.'/'.Str::uuid().'.'.$extension;
            Storage::disk('local')->put($path, $file->getContent());

            try {
                return $mediable->media()->create([
                    'collection' => $collection,
                    'disk' => 'local',
                    'path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'byte_size' => $file->getSize(),
                    'width' => $dimensions[0],
                    'height' => $dimensions[1],
                    'position' => ($existing->max('position') ?? -1) + 1,
                    'is_primary' => $existing->isEmpty(),
                    'original_name' => Str::limit($originalName, 255, ''),
                    'created_by' => $creator->id,
                ]);
            } catch (Throwable $exception) {
                Storage::disk('local')->delete($path);
                throw $exception;
            }
        });
    }

    public function setPrimary(Media $media): Media
    {
        return DB::transaction(function () use ($media): Media {
            Media::query()
                ->where('mediable_type', $media->mediable_type)
                ->where('mediable_id', $media->mediable_id)
                ->where('collection', $media->collection)
                ->update(['is_primary' => false]);
            $media->update(['is_primary' => true]);

            return $media->fresh();
        });
    }

    public function delete(Media $media): void
    {
        DB::transaction(function () use ($media): void {
            $wasPrimary = $media->is_primary;
            $type = $media->mediable_type;
            $id = $media->mediable_id;
            $collection = $media->collection;
            $media->delete();

            if ($wasPrimary) {
                $next = Media::query()
                    ->where('mediable_type', $type)
                    ->where('mediable_id', $id)
                    ->where('collection', $collection)
                    ->orderBy('position')
                    ->orderBy('id')
                    ->first();
                $next?->update(['is_primary' => true]);
            }
        });
    }
}
