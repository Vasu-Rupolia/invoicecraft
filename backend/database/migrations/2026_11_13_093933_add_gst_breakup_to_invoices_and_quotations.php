<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['invoices', 'quotations'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->decimal('cgst_amount', 12, 2)->default(0)->after('tax_amount');
                $table->decimal('sgst_amount', 12, 2)->default(0)->after('cgst_amount');
                $table->decimal('igst_amount', 12, 2)->default(0)->after('sgst_amount');

                $table->string('tax_type', 20)->nullable()->after('igst_amount');
                $table->string('place_of_supply_state')->nullable()->after('tax_type');
                $table->string('place_of_supply_state_code', 2)->nullable()->after('place_of_supply_state');
            });
        }

        foreach (['invoice_items', 'quotation_items'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->decimal('cgst_amount', 12, 2)->default(0)->after('tax_amount');
                $table->decimal('sgst_amount', 12, 2)->default(0)->after('cgst_amount');
                $table->decimal('igst_amount', 12, 2)->default(0)->after('sgst_amount');
            });
        }
    }

    public function down(): void
    {
        foreach (['invoice_items', 'quotation_items'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn([
                    'cgst_amount',
                    'sgst_amount',
                    'igst_amount',
                ]);
            });
        }

        foreach (['invoices', 'quotations'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn([
                    'cgst_amount',
                    'sgst_amount',
                    'igst_amount',
                    'tax_type',
                    'place_of_supply_state',
                    'place_of_supply_state_code',
                ]);
            });
        }
    }
};