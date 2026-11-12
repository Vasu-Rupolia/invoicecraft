<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request, int $businessId)
    {
        $user = $request->user();

        // Verify that the authenticated user belongs to this business.
        $business = $user->activeBusinessProfiles()
            ->where('business_profiles.id', $businessId)
            ->first();

        if (!$business) {
            return response()->json([
                'message' => 'Business not found or access denied.',
            ], 404);
        }

        $today = Carbon::today();
        $monthStart = Carbon::now()->startOfMonth();
        $monthEnd = Carbon::now()->endOfMonth();

        $paymentsQuery = Payment::where('business_profile_id', $businessId);

        $invoicesQuery = Invoice::where('business_profile_id', $businessId);

        $outstandingQuery = (clone $invoicesQuery)
            ->whereNotIn('status', ['draft', 'cancelled']);

        $totalRevenue = (clone $paymentsQuery)->sum('amount');

        $monthlyRevenue = (clone $paymentsQuery)
            ->whereBetween('payment_date', [
                $monthStart->toDateString(),
                $monthEnd->toDateString(),
            ])
            ->sum('amount');

        $outstandingAmount = (clone $outstandingQuery)
            ->sum('balance_due');

        $totalInvoices = (clone $invoicesQuery)->count();

        $pendingInvoices = (clone $outstandingQuery)
            ->where('balance_due', '>', 0)
            ->count();

        $paidInvoices = (clone $invoicesQuery)
            ->where('status', 'paid')
            ->count();

        $totalCustomers = Customer::where(
            'business_profile_id',
            $businessId
        )->count();

        $overdueInvoices = (clone $outstandingQuery)
            ->where('balance_due', '>', 0)
            ->whereDate('due_date', '<', $today)
            ->count();

        $recentInvoices = (clone $invoicesQuery)
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
                'currency',
            ])
            ->latest('invoice_date')
            ->limit(5)
            ->get();

        return response()->json([
            'business' => [
                'id' => $business->id,
                'name' => $business->name,
                'currency' => $business->currency,
            ],

            'metrics' => [
                'total_revenue' => (float) $totalRevenue,
                'monthly_revenue' => (float) $monthlyRevenue,
                'outstanding_amount' => (float) $outstandingAmount,
                'total_invoices' => $totalInvoices,
                'pending_invoices' => $pendingInvoices,
                'paid_invoices' => $paidInvoices,
                'overdue_invoices' => $overdueInvoices,
                'total_customers' => $totalCustomers,
            ],

            'recent_invoices' => $recentInvoices,
        ]);
    }
}