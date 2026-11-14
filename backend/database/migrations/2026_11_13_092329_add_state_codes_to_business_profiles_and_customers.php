<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('business_profiles', function (Blueprint $table) {
            $table->string('state_code', 2)->nullable()->after('state');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->string('state')->nullable()->after('gstin');
            $table->string('state_code', 2)->nullable()->after('state');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['state', 'state_code']);
        });

        Schema::table('business_profiles', function (Blueprint $table) {
            $table->dropColumn('state_code');
        });
    }
};