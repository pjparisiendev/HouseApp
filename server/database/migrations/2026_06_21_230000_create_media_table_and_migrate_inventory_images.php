<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('mediable_type');
            $table->unsignedBigInteger('mediable_id');
            $table->string('collection', 40)->default('images');
            $table->string('disk', 40)->default('local');
            $table->string('path')->unique();
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('byte_size');
            $table->unsignedInteger('width')->default(0);
            $table->unsignedInteger('height')->default(0);
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->string('original_name')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['mediable_type', 'mediable_id', 'collection'], 'media_owner_collection_index');
        });

        DB::table('inventory_items')
            ->whereNotNull('image_path')
            ->orderBy('id')
            ->each(function ($item): void {
                $path = $item->image_path;
                $absolutePath = Storage::disk('local')->path($path);
                $dimensions = is_file($absolutePath) ? @getimagesize($absolutePath) : false;

                DB::table('media')->insert([
                    'mediable_type' => 'App\\Models\\InventoryItem',
                    'mediable_id' => $item->id,
                    'collection' => 'images',
                    'disk' => 'local',
                    'path' => $path,
                    'mime_type' => $dimensions['mime'] ?? 'application/octet-stream',
                    'byte_size' => is_file($absolutePath) ? filesize($absolutePath) : 0,
                    'width' => $dimensions[0] ?? 0,
                    'height' => $dimensions[1] ?? 0,
                    'position' => 0,
                    'is_primary' => true,
                    'original_name' => basename($path),
                    'created_by' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }

    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->string('image_path')->nullable();
        });

        DB::table('media')
            ->where('mediable_type', 'App\\Models\\InventoryItem')
            ->where('collection', 'images')
            ->where('is_primary', true)
            ->each(function ($media): void {
                DB::table('inventory_items')
                    ->where('id', $media->mediable_id)
                    ->update(['image_path' => $media->path]);
            });

        Schema::dropIfExists('media');
    }
};
