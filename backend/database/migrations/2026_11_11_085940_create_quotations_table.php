<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();

            $table->foreignId('business_profile_id')
                ->constrained('business_profiles')
                ->cascadeOnDelete();

            $table->foreignId('customer_id')
                ->nullable()
                ->constrained('customers')
                ->nullOnDelete();

            $table->string('quotation_number', 50);

            $table->date('quotation_date');
            $table->date('valid_until')->nullable();

            // Customer snapshot
            $table->string('customer_name');
            $table->string('customer_email')->nullable();
            $table->string('customer_phone', 20)->nullable();
            $table->string('customer_gstin', 15)->nullable();
            $table->text('billing_address')->nullable();

            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);

            $table->string('currency', 3)->default('INR');

            $table->string('status', 20)->default('draft');

            $table->text('notes')->nullable();
            $table->text('terms')->nullable();

            $table->timestamps();

            $table->unique([
                'business_profile_id',
                'quotation_number'
            ]);

            $table->index([
                'business_profile_id',
                'status',
                'quotation_date'
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotations');
    }
};
