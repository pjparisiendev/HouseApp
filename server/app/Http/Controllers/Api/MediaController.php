<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\Media;
use App\Services\MediaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    public function __construct(private readonly MediaService $mediaService) {}

    public function content(Request $request, Media $media)
    {
        $this->authorizeHousehold($request, $media);
        abort_unless(Storage::disk($media->disk)->exists($media->path), 404);

        return Storage::disk($media->disk)->response(
            $media->path,
            $media->original_name,
            [
                'Content-Type' => $media->mime_type,
                'Content-Disposition' => 'inline',
                'Cache-Control' => 'private, max-age=86400',
            ],
        );
    }

    public function destroy(Request $request, Media $media)
    {
        $this->authorizeHousehold($request, $media);
        $this->mediaService->delete($media);

        return response()->noContent();
    }

    public function primary(Request $request, Media $media)
    {
        $this->authorizeHousehold($request, $media);

        return $this->mediaService->setPrimary($media);
    }

    private function authorizeHousehold(Request $request, Media $media): void
    {
        $parent = $media->mediable;

        if ($parent instanceof InventoryItem) {
            abort_unless($request->user()->household_id === $parent->household_id, 404);

            return;
        }

        abort(404);
    }
}
