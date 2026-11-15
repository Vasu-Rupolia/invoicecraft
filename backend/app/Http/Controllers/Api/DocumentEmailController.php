<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendDocumentEmailJob;
use App\Models\BusinessProfile;
use App\Models\DocumentEmailLog;
use App\Models\Invoice;
use App\Models\Quotation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class DocumentEmailController extends Controller
{
    private function getBusiness(Request $request, int $businessId): BusinessProfile
    {
        $business = $request->user()
            ->activeBusinessProfiles()
            ->where('business_profiles.id', $businessId)
            ->first();

        if (!$business) {
            abort(404, 'Business not found or access denied.');
        }

        return $business;
    }

    private function getMailSettings(BusinessProfile $business): array
    {
        $hasCustomSmtp = !empty($business->smtp_host)
            || !empty($business->smtp_port)
            || !empty($business->smtp_username)
            || !empty($business->smtp_password)
            || !empty($business->smtp_from_address);

        if ($hasCustomSmtp) {
            $host = $business->smtp_host;
            $port = $business->smtp_port;
            $username = $business->smtp_username;
            $password = $business->smtp_password;
            $fromAddress = $business->smtp_from_address;

            if (
                !$host ||
                !$port ||
                !$fromAddress ||
                (($username && !$password) || (!$username && $password))
            ) {
                abort(
                    422,
                    'Your business SMTP settings are incomplete. Please update them or remove the custom SMTP configuration.'
                );
            }

            return [
                'mailer' => [
                    'transport' => 'smtp',
                    'scheme' => $business->smtp_encryption === 'ssl'
                        ? 'smtps'
                        : 'smtp',
                    'host' => $host,
                    'port' => $port,
                    'username' => $username,
                    'password' => $password,
                    'timeout' => 20,
                    'local_domain' => parse_url(
                        (string) config('app.url'),
                        PHP_URL_HOST
                    ),
                ],
                'from_address' => $fromAddress,
                'from_name' => $business->smtp_from_name ?: $business->name,
            ];
        }

        $platformMailer = config('mail.mailers.smtp', []);
        $platformFrom = config('mail.from', []);

        $host = $platformMailer['host'] ?? null;
        $port = $platformMailer['port'] ?? null;
        $fromAddress = $platformFrom['address'] ?? null;

        if (!$host || !$port || !$fromAddress) {
            abort(
                500,
                'InvoiceCraft email service is not configured. Please contact support.'
            );
        }

        $platformMailer['transport'] = 'smtp';
        $platformMailer['scheme'] = $platformMailer['scheme'] ?? 'smtp';
        $platformMailer['timeout'] = $platformMailer['timeout'] ?? 20;

        return [
            'mailer' => $platformMailer,
            'from_address' => $fromAddress,
            'from_name' => $platformFrom['name'] ?? config('app.name'),
        ];
    }

    private function ensureSmtpConfigured(BusinessProfile $business): void
    {
        $this->getMailSettings($business);
    }

    private function logTiming(
        string $operation,
        string $phase,
        int $startedAt
    ): void {
        logger()->info('Document email API timing', [
            'operation' => $operation,
            'phase' => $phase,
            'elapsed_ms' => round((hrtime(true) - $startedAt) / 1_000_000, 2),
        ]);
    }

    private function sendDocument(
        Request $request,
        BusinessProfile $business,
        string $documentType,
        Invoice|Quotation $document
    ) {
        $startedAt = hrtime(true);

        $validated = $request->validate([
            'pdf' => ['required', 'file', 'mimes:pdf', 'max:10240'],
            'recipient' => ['required', 'email', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:5000'],
        ]);

        $this->logTiming($documentType, 'validation_complete', $startedAt);

        $this->ensureSmtpConfigured($business);

        $this->logTiming($documentType, 'smtp_validation_complete', $startedAt);

        $documentNumber = $document->invoice_number
            ?? $document->quotation_number
            ?? $document->number
            ?? (string) $document->id;

        $attachmentPath = $request->file('pdf')->store(
            "document-emails/{$business->id}",
            'local'
        );

        $this->logTiming($documentType, 'pdf_stored', $startedAt);

        $emailLog = DocumentEmailLog::create([
            'business_profile_id' => $business->id,
            'document_type' => $documentType,
            'document_id' => $document->id,
            'document_number' => $documentNumber,
            'recipient' => $validated['recipient'],
            'subject' => $validated['subject'],
            'message' => $validated['message'] ?? null,
            'attachment_path' => $attachmentPath,
            'status' => 'pending',
            'sent_by' => $request->user()->id,
        ]);

        $this->logTiming($documentType, 'email_log_created', $startedAt);

        SendDocumentEmailJob::dispatch(
            $emailLog->id,
            $business->id
        );

        $this->logTiming($documentType, 'job_dispatched', $startedAt);

        return response()->json([
            'message' => 'Email queued successfully. It will be sent shortly.',
            'email' => $emailLog->makeHidden([
                'attachment_path',
                'error_message',
            ]),
        ], 202);
    }

    public function sendInvoice(
        Request $request,
        int $businessId,
        int $invoiceId
    ) {
        $business = $this->getBusiness($request, $businessId);

        $invoice = Invoice::where('business_profile_id', $business->id)
            ->where('id', $invoiceId)
            ->firstOrFail();

        return $this->sendDocument(
            $request,
            $business,
            'invoice',
            $invoice
        );
    }

    public function sendQuotation(
        Request $request,
        int $businessId,
        int $quotationId
    ) {
        $business = $this->getBusiness($request, $businessId);

        $quotation = Quotation::where('business_profile_id', $business->id)
            ->where('id', $quotationId)
            ->firstOrFail();

        return $this->sendDocument(
            $request,
            $business,
            'quotation',
            $quotation
        );
    }

    public function index(Request $request, int $businessId)
    {
        $this->getBusiness($request, $businessId);

        $validated = $request->validate([
            'document_type' => [
                'nullable',
                Rule::in(['invoice', 'quotation']),
            ],
            'document_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = DocumentEmailLog::where(
            'business_profile_id',
            $businessId
        );

        if (!empty($validated['document_type'])) {
            $query->where('document_type', $validated['document_type']);
        }

        if (!empty($validated['document_id'])) {
            $query->where('document_id', $validated['document_id']);
        }

        $logs = $query
            ->latest()
            ->paginate(15);

        $logs->getCollection()->each(function ($log) {
            $log->makeHidden(['attachment_path', 'error_message']);
        });

        return response()->json($logs);
    }

    public function resend(
        Request $request,
        int $businessId,
        int $emailLogId
    ) {
        $startedAt = hrtime(true);

        $business = $this->getBusiness($request, $businessId);

        $validated = $request->validate([
            'recipient' => ['sometimes', 'required', 'email', 'max:255'],
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'message' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $emailLog = DocumentEmailLog::where(
            'business_profile_id',
            $businessId
        )->where('id', $emailLogId)->firstOrFail();

        if ($emailLog->status !== 'failed') {
            return response()->json([
                'message' => 'Only failed emails can be resent.',
            ], 422);
        }

        $this->ensureSmtpConfigured($business);

        if (!Storage::disk('local')->exists($emailLog->attachment_path)) {
            return response()->json([
                'message' => 'The stored PDF attachment could not be found.',
            ], 404);
        }

        $emailLog->update([
            'recipient' => $validated['recipient'] ?? $emailLog->recipient,
            'subject' => $validated['subject'] ?? $emailLog->subject,
            'message' => array_key_exists('message', $validated)
                ? $validated['message']
                : $emailLog->message,
            'status' => 'pending',
            'error_message' => null,
            'sent_at' => null,
        ]);

        $this->logTiming('resend', 'email_log_updated', $startedAt);

        SendDocumentEmailJob::dispatch(
            $emailLog->id,
            $business->id
        );

        $this->logTiming('resend', 'job_dispatched', $startedAt);

        return response()->json([
            'message' => 'Email queued for resending.',
            'email' => $emailLog->makeHidden([
                'attachment_path',
                'error_message',
            ]),
        ], 202);
    }
}