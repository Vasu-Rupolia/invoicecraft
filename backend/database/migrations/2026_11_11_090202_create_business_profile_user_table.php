<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_profile_user', function (Blueprint $table) {
            $table->id();

            $table->foreignId('business_profile_id')
                ->constrained('business_profiles')
                ->cascadeOnDelete();

            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->string('role')->default('member');
            $table->string('status')->default('active');

            $table->timestamps();

            $table->unique(['business_profile_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_profile_user');
    }
};
