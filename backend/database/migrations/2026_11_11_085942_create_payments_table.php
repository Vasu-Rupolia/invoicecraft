<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('business_profile_id')
                ->constrained('business_profiles')
                ->cascadeOnDelete();

            $table->foreignId('invoice_id')
                ->constrained('invoices')
                ->cascadeOnDelete();

            $table->string('payment_number', 50)->nullable();

            $table->decimal('amount', 15, 2);

            $table->string('payment_method', 30)->default('cash');

            $table->string('transaction_reference')->nullable();

            $table->date('payment_date');

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->index([
                'business_profile_id',
                'payment_date'
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
