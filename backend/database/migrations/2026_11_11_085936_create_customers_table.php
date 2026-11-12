<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('business_profile_id')
                ->constrained('business_profiles')
                ->cascadeOnDelete();

            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('company_name')->nullable();
            $table->string('gstin', 15)->nullable();

            $table->text('billing_address')->nullable();
            $table->text('shipping_address')->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index(['business_profile_id', 'name']);
            $table->index(['business_profile_id', 'phone']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
