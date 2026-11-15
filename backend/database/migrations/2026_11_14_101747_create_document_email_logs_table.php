<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_email_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('business_profile_id')
                ->constrained('business_profiles')
                ->cascadeOnDelete();

            // invoice or quotation
            $table->string('document_type', 20);
            $table->unsignedBigInteger('document_id');
            $table->string('document_number', 50);

            $table->string('recipient');
            $table->string('subject');
            $table->text('message')->nullable();

            // Private local storage path
            $table->string('attachment_path');

            // pending, sent, failed
            $table->string('status', 20)->default('pending');

            $table->text('error_message')->nullable();

            $table->foreignId('sent_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('sent_at')->nullable();

            $table->timestamps();

            $table->index(
                ['business_profile_id', 'document_type', 'document_id'],
                'document_email_logs_document_index'
            );

            $table->index(
                ['business_profile_id', 'status'],
                'document_email_logs_status_index'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_email_logs');
    }
};