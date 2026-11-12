<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_profiles', function (Blueprint $table) {
            $table->id();

            $table->string('name');
            $table->string('business_type')->default('freelancer');

            $table->string('email')->nullable();
            $table->string('phone', 20)->nullable();

            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('country')->default('India');
            $table->string('postal_code', 20)->nullable();

            $table->string('gstin', 15)->nullable();
            $table->string('logo_path')->nullable();

            $table->string('currency', 3)->default('INR');
            $table->string('invoice_prefix', 20)->default('INV');
            $table->unsignedBigInteger('next_invoice_number')->default(1);
            $table->string('quotation_prefix', 20)->default('QUO');
            $table->unsignedBigInteger('next_quotation_number')->default(1);

            $table->string('timezone')->default('Asia/Kolkata');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_profiles');
    }
};
