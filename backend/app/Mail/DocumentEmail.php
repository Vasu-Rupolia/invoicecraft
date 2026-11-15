<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DocumentEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $subjectLine,
        public string $messageBody,
        public string $businessName,
        public string $pdfBytes,
        public string $filename,
        public string $fromAddress,
        public string $fromName,
        public ?string $replyToAddress = null
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(
                $this->fromAddress,
                $this->fromName
            ),
            replyTo: $this->replyToAddress
                ? [
                    new Address(
                        $this->replyToAddress,
                        $this->businessName
                    ),
                ]
                : [],
            subject: $this->subjectLine
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.document',
            with: [
                'messageBody' => $this->messageBody,
                'businessName' => $this->businessName,
            ]
        );
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(
                fn () => $this->pdfBytes,
                $this->filename
            )->withMime('application/pdf'),
        ];
    }
}