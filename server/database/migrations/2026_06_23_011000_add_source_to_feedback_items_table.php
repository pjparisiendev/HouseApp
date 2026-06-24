<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('feedback_items', function (Blueprint $table) {
            $table->string('source_path')->nullable()->after('priority');
            $table->string('source_label')->nullable()->after('source_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feedback_items', function (Blueprint $table) {
            $table->dropColumn(['source_path', 'source_label']);
        });
    }
};
