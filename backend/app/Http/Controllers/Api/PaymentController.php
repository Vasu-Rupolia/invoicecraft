<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    private function getBusiness(
        Request $request,
        int $businessId
    ): BusinessProfile {
        $business = $request->user()
            ->activeBusinessProfiles()
            ->where('business_profiles.id', $businessId)
            ->first();

        if (!$business) {
            abort(404, 'Business not found or access denied.');
        }

        return $business;
    }

    private function updateInvoicePaymentSummary(Invoice $invoice): void
    {
        $amountPaid = (int) round(
            (float) $invoice->payments()->sum('amount') * 100
        );

        $total = (int) round((float) $invoice->total * 100);

        $balanceDue = max(0, $total - $amountPaid);

        $invoice->amount_paid = $amountPaid / 100;
        $invoice->balance_due = $balanceDue / 100;

        // Draft invoices should retain their draft status.
        if ($invoice->status !== 'draft') {
            if ($balanceDue <= 0) {
                $invoice->status = 'paid';
            } elseif ($amountPaid > 0) {
                $invoice->status = 'partially_paid';
            } elseif (
                $invoice->due_date &&
                Carbon::parse($invoice->due_date)->startOfDay()
                    ->lt(Carbon::today())
            ) {
                $invoice->status = 'overdue';
            } else {
                $invoice->status = 'sent';
            }
        }

        $invoice->save();
    }

    /**
     * List payments for an invoice.
     */
    public function index(
        Request $request,
        int $businessId,
        int $invoiceId
    ) {
        $this->getBusiness($request, $businessId);

        $invoice = Invoice::where('business_profile_id', $businessId)
            ->where('id', $invoiceId)
            ->firstOrFail();

        $payments = $invoice->payments()
            ->latest('payment_date')
            ->latest('id')
            ->get();

        return response()->json([
            'payments' => $payments,
        ]);
    }

    /**
     * Record a payment against an invoice.
     */
    public function store(
        Request $request,
        int $businessId,
        int $invoiceId
    ) {
        $this->getBusiness($request, $businessId);

        $validated = $request->validate([
            'amount' => [
                'required',
                'numeric',
                'gt:0',
                'decimal:0,2',
            ],

            'payment_method' => [
                'required',
                Rule::in([
                    'cash',
                    'upi',
                    'bank_transfer',
                    'card',
                    'cheque',
                    'other',
                ]),
            ],

            'transaction_reference' => [
                'nullable',
                'string',
                'max:255',
            ],

            'payment_date' => [
                'required',
                'date',
            ],

            'notes' => [
                'nullable',
                'string',
                'max:10000',
            ],
        ]);

        $payment = DB::transaction(function () use (
            $businessId,
            $invoiceId,
            $validated
        ) {
            $invoice = Invoice::where('business_profile_id', $businessId)
                ->where('id', $invoiceId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($invoice->status === 'draft') {
                throw ValidationException::withMessages([
                    'invoice' => [
                        'Payments cannot be recorded against draft invoices. Send the invoice first.',
                    ],
                ]);
            }

            $total = (int) round((float) $invoice->total * 100);

            $amountPaid = (int) round(
                (float) $invoice->payments()->sum('amount') * 100
            );

            $balanceDue = max(0, $total - $amountPaid);

            $paymentAmount = (int) round(
                (float) $validated['amount'] * 100
            );

            if ($paymentAmount > $balanceDue) {
                throw ValidationException::withMessages([
                    'amount' => [
                        'Payment amount cannot exceed the outstanding balance of '
                        . number_format($balanceDue / 100, 2, '.', '')
                        . '.',
                    ],
                ]);
            }

            $payment = Payment::create([
                'business_profile_id' => $businessId,
                'invoice_id' => $invoice->id,
                'payment_number' => null,
                'amount' => $paymentAmount / 100,
                'payment_method' => $validated['payment_method'],
                'transaction_reference' => $validated['transaction_reference'] ?? null,
                'payment_date' => $validated['payment_date'],
                'notes' => $validated['notes'] ?? null,
            ]);

            // Use the payment ID to generate a unique payment number.
            $payment->payment_number = 'PAY-' . str_pad(
                (string) $payment->id,
                5,
                '0',
                STR_PAD_LEFT
            );

            $payment->save();

            $this->updateInvoicePaymentSummary($invoice);

            return $payment;
        });

        $invoice = Invoice::with(['items', 'payments'])
            ->where('business_profile_id', $businessId)
            ->findOrFail($invoiceId);

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'payment' => $payment,
            'invoice' => $invoice,
        ], 201);
    }

    /**
     * Delete a payment and recalculate the invoice balance.
     */
    public function destroy(
        Request $request,
        int $businessId,
        int $paymentId
    ) {
        $this->getBusiness($request, $businessId);

        DB::transaction(function () use (
            $businessId,
            $paymentId
        ) {
            // Find the payment only within the selected business.
            $existingPayment = Payment::where('business_profile_id', $businessId)
                ->where('id', $paymentId)
                ->firstOrFail();

            // Always lock invoice first to keep payment operations consistent.
            $invoice = Invoice::where('business_profile_id', $businessId)
                ->where('id', $existingPayment->invoice_id)
                ->lockForUpdate()
                ->firstOrFail();

            $payment = Payment::where('business_profile_id', $businessId)
                ->where('invoice_id', $invoice->id)
                ->where('id', $paymentId)
                ->lockForUpdate()
                ->firstOrFail();

            $payment->delete();

            $this->updateInvoicePaymentSummary($invoice);
        });

        return response()->json([
            'message' => 'Payment deleted successfully.',
        ]);
    }
}