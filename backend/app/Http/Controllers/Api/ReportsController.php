<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\Invoice;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
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

    public function index(Request $request, int $businessId)
    {
        $this->getBusiness($request, $businessId);

        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => [
                'nullable',
                'date',
                'after_or_equal:from_date',
            ],
        ]);

        $fromDate = $validated['from_date']
            ?? Carbon::now()->startOfYear()->toDateString();

        $toDate = $validated['to_date']
            ?? Carbon::today()->toDateString();

        $today = Carbon::today()->toDateString();

        /*
        |--------------------------------------------------------------------------
        | Invoice query
        |--------------------------------------------------------------------------
        */

        $invoiceQuery = Invoice::where(
            'business_profile_id',
            $businessId
        )
            ->where('status', '!=', 'draft')
            ->whereBetween('invoice_date', [$fromDate, $toDate]);

        $invoiceSummary = (clone $invoiceQuery)
            ->selectRaw('
                COUNT(*) as invoice_count,
                COALESCE(SUM(total), 0) as invoiced_amount,
                COALESCE(SUM(amount_paid), 0) as invoice_amount_paid,
                COALESCE(SUM(balance_due), 0) as outstanding_amount
            ')
            ->first();

        /*
        |--------------------------------------------------------------------------
        | Payment summary
        |--------------------------------------------------------------------------
        | Payments are filtered using payment_date, not invoice_date.
        */

        $paymentQuery = Payment::where(
            'business_profile_id',
            $businessId
        )
            ->whereBetween('payment_date', [$fromDate, $toDate]);

        $paymentSummary = (clone $paymentQuery)
            ->selectRaw('
                COUNT(*) as payment_count,
                COALESCE(SUM(amount), 0) as received_amount
            ')
            ->first();

        /*
        |--------------------------------------------------------------------------
        | Overdue amount
        |--------------------------------------------------------------------------
        | Calculate overdue from due_date and balance_due instead of relying
        | only on the stored status, which may not yet have been refreshed.
        */

        $overdueAmount = (clone $invoiceQuery)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $today)
            ->where('balance_due', '>', 0)
            ->sum('balance_due');

        $overdueCount = (clone $invoiceQuery)
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $today)
            ->where('balance_due', '>', 0)
            ->count();

        /*
        |--------------------------------------------------------------------------
        | Monthly revenue
        |--------------------------------------------------------------------------
        */

        $monthlyRevenueRows = (clone $invoiceQuery)
            ->selectRaw("
                DATE_FORMAT(invoice_date, '%Y-%m') as month,
                COALESCE(SUM(total), 0) as revenue
            ")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $monthlyRevenue = [];

        $periodStart = Carbon::parse($fromDate)->startOfMonth();
        $periodEnd = Carbon::parse($toDate)->startOfMonth();

        while ($periodStart->lte($periodEnd)) {
            $monthKey = $periodStart->format('Y-m');

            $monthlyRevenue[] = [
                'month' => $monthKey,
                'label' => $periodStart->format('M Y'),
                'revenue' => round(
                    (float) ($monthlyRevenueRows[$monthKey]->revenue ?? 0),
                    2
                ),
            ];

            $periodStart->addMonth();
        }

        /*
        |--------------------------------------------------------------------------
        | Payment methods
        |--------------------------------------------------------------------------
        */

        $paymentMethods = (clone $paymentQuery)
            ->select(
                'payment_method',
                DB::raw('COUNT(*) as payment_count'),
                DB::raw('COALESCE(SUM(amount), 0) as amount')
            )
            ->groupBy('payment_method')
            ->orderByDesc('amount')
            ->get()
            ->map(fn ($payment) => [
                'payment_method' => $payment->payment_method,
                'payment_count' => (int) $payment->payment_count,
                'amount' => round((float) $payment->amount, 2),
            ])
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Outstanding invoices
        |--------------------------------------------------------------------------
        */

        $outstandingInvoices = (clone $invoiceQuery)
            ->where('balance_due', '>', 0)
            ->select([
                'id',
                'invoice_number',
                'customer_name',
                'invoice_date',
                'due_date',
                'total',
                'amount_paid',
                'balance_due',
                'status',
            ])
            ->orderByRaw('due_date IS NULL ASC')
            ->orderBy('due_date')
            ->orderBy('id')
            ->limit(100)
            ->get()
            ->map(fn ($invoice) => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'customer_name' => $invoice->customer_name,
                'invoice_date' => $invoice->invoice_date?->toDateString(),
                'due_date' => $invoice->due_date?->toDateString(),
                'total' => (float) $invoice->total,
                'amount_paid' => (float) $invoice->amount_paid,
                'balance_due' => (float) $invoice->balance_due,
                'status' => $invoice->status,
                'is_overdue' => $invoice->due_date
                    && $invoice->due_date->lt(Carbon::today())
                    && (float) $invoice->balance_due > 0,
            ])
            ->values();

        return response()->json([
            'filters' => [
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],

            'summary' => [
                'invoice_count' => (int) $invoiceSummary->invoice_count,
                'invoiced_amount' => round(
                    (float) $invoiceSummary->invoiced_amount,
                    2
                ),
                'received_amount' => round(
                    (float) $paymentSummary->received_amount,
                    2
                ),
                'outstanding_amount' => round(
                    (float) $invoiceSummary->outstanding_amount,
                    2
                ),
                'overdue_amount' => round(
                    (float) $overdueAmount,
                    2
                ),
                'overdue_count' => (int) $overdueCount,
                'payment_count' => (int) $paymentSummary->payment_count,
            ],

            'monthly_revenue' => $monthlyRevenue,

            'payment_methods' => $paymentMethods,

            'outstanding_invoices' => $outstandingInvoices,
        ]);
    }
}