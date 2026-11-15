<?php

namespace App\Jobs;

use App\Mail\DocumentEmail;
use App\Models\BusinessProfile;
use App\Models\DocumentEmailLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

class SendDocumentEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [10, 30, 60];

    public function __construct(
        public int $emailLogId,
        public int $businessId
    ) {
    }

    public function handle(): void
    {
        $emailLog = DocumentEmailLog::where('id', $this->emailLogId)
            ->where('business_profile_id', $this->businessId)
            ->first();

        $business = BusinessProfile::find($this->businessId);

        if (!$emailLog || !$business) {
            return;
        }

        if (!Storage::disk('local')->exists($emailLog->attachment_path)) {
            throw new RuntimeException('Email PDF attachment not found.');
        }

        $settings = $this->getMailSettings($business);

        $pdfBytes = Storage::disk('local')->get(
            $emailLog->attachment_path
        );

        $filename = preg_replace(
            '/[^A-Za-z0-9._-]/',
            '_',
            $emailLog->document_number
        ) . '.pdf';

        $replyToAddress = filter_var(
            $business->email,
            FILTER_VALIDATE_EMAIL
        ) ? $business->email : null;

        $mailer = Mail::build($settings['mailer']);

        $mailer->to($emailLog->recipient)->send(
            new DocumentEmail(
                subjectLine: $emailLog->subject,
                messageBody: $emailLog->message ?? '',
                businessName: $business->name,
                pdfBytes: $pdfBytes,
                filename: $filename,
                fromAddress: $settings['from_address'],
                fromName: $settings['from_name'],
                replyToAddress: $replyToAddress
            )
        );

        $emailLog->update([
            'status' => 'sent',
            'sent_at' => now(),
            'error_message' => null,
        ]);
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
                throw new RuntimeException(
                    'Business SMTP settings are incomplete.'
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
            throw new RuntimeException(
                'InvoiceCraft platform email service is not configured.'
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

    public function failed(?Throwable $exception): void
    {
        DocumentEmailLog::where('id', $this->emailLogId)
            ->where('business_profile_id', $this->businessId)
            ->update([
                'status' => 'failed',
                'error_message' => 'Email delivery failed after multiple attempts. Please check SMTP settings and try again.',
            ]);
    }
}