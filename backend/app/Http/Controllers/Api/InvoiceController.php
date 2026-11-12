<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;

class InvoiceController extends Controller
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

    private function getInvoice(
        int $businessId,
        int $invoiceId,
        bool $withRelations = false
    ): Invoice {
        $query = Invoice::where('business_profile_id', $businessId)
            ->where('id', $invoiceId);

        if ($withRelations) {
            $query->with(['items', 'payments']);
        }

        $invoice = $query->first();

        if (!$invoice) {
            abort(404, 'Invoice not found.');
        }

        return $invoice;
    }

    private function validateCustomer(
        int $businessId,
        ?int $customerId
    ): ?Customer {
        if (!$customerId) {
            return null;
        }

        $customer = Customer::where('business_profile_id', $businessId)
            ->where('id', $customerId)
            ->first();

        if (!$customer) {
            throw ValidationException::withMessages([
                'customer_id' => [
                    'The selected customer does not belong to this business.',
                ],
            ]);
        }

        return $customer;
    }

    private function calculateTotals(array $items, float $invoiceDiscount): array
    {
        $subtotal = 0;
        $itemDiscountTotal = 0;
        $preInvoiceDiscountBases = [];

        foreach ($items as $index => $item) {
            $gross = round(
                (float) $item['quantity'] * (float) $item['unit_price'],
                2
            );

            $discount = round((float) ($item['discount'] ?? 0), 2);

            if ($discount > $gross) {
                throw ValidationException::withMessages([
                    "items.$index.discount" => [
                        'Item discount cannot exceed its gross amount.',
                    ],
                ]);
            }

            $base = round($gross - $discount, 2);

            $subtotal += $gross;
            $itemDiscountTotal += $discount;

            $preInvoiceDiscountBases[] = $base;
        }

        $subtotal = round($subtotal, 2);
        $itemDiscountTotal = round($itemDiscountTotal, 2);

        $taxableSubtotal = round(
            $subtotal - $itemDiscountTotal,
            2
        );

        if ($invoiceDiscount > $taxableSubtotal) {
            throw ValidationException::withMessages([
                'discount' => [
                    'Invoice discount cannot exceed the amount after item discounts.',
                ],
            ]);
        }

        $remainingTaxableAmount = round(
            $taxableSubtotal - $invoiceDiscount,
            2
        );

        $totalDiscount = round(
            $itemDiscountTotal + $invoiceDiscount,
            2
        );

        $calculatedItems = [];
        $taxAmount = 0;
        $distributedDiscount = 0;
        $lastIndex = count($items) - 1;

        foreach ($items as $index => $item) {
            $base = $preInvoiceDiscountBases[$index];

            // Distribute invoice-level discount proportionally.
            if ($index === $lastIndex) {
                $allocatedDiscount = round(
                    $invoiceDiscount - $distributedDiscount,
                    2
                );
            } elseif ($taxableSubtotal > 0) {
                $allocatedDiscount = round(
                    $invoiceDiscount * ($base / $taxableSubtotal),
                    2
                );

                $distributedDiscount += $allocatedDiscount;
            } else {
                $allocatedDiscount = 0;
            }

            $taxableAmount = max(
                0,
                round($base - $allocatedDiscount, 2)
            );

            $rate = (float) ($item['tax_rate'] ?? 0);

            $itemTax = round(
                $taxableAmount * $rate / 100,
                2
            );

            $lineTotal = round(
                $taxableAmount + $itemTax,
                2
            );

            $taxAmount += $itemTax;

            $calculatedItems[] = [
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit' => $item['unit'] ?? 'unit',
                'unit_price' => $item['unit_price'],
                'discount' => $item['discount'] ?? 0,
                'tax_rate' => $rate,
                'tax_amount' => $itemTax,
                'line_total' => $lineTotal,
            ];
        }

        $taxAmount = round($taxAmount, 2);

        $total = round(
            $remainingTaxableAmount + $taxAmount,
            2
        );

        return [
            'subtotal' => $subtotal,
            'discount' => $totalDiscount,
            'tax_amount' => $taxAmount,
            'total' => $total,
            'items' => $calculatedItems,
        ];
    }

    private function syncInvoiceItems(Invoice $invoice, array $items): void
    {
        $invoice->items()->delete();

        foreach ($items as $item) {
            $invoice->items()->create($item);
        }
    }

    private function generateInvoiceNumber(BusinessProfile $business): string
    {
        $number = $business->next_invoice_number;

        return $business->invoice_prefix . '-' . str_pad(
            (string) $number,
            5,
            '0',
            STR_PAD_LEFT
        );
    }

    private function updateInvoiceStatus(Invoice $invoice): void
    {
        if ($invoice->status === 'draft') {
            return;
        }

        if ((float) $invoice->balance_due <= 0) {
            $invoice->status = 'paid';
        } elseif ((float) $invoice->amount_paid > 0) {
            $invoice->status = 'partially_paid';
        } elseif (
            $invoice->due_date &&
            Carbon::parse($invoice->due_date)->isPast()
        ) {
            $invoice->status = 'overdue';
        } else {
            $invoice->status = 'sent';
        }

        $invoice->save();
    }

    /**
     * List invoices.
     */
    public function index(Request $request, int $businessId)
    {
        $this->getBusiness($request, $businessId);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => [
                'nullable',
                Rule::in([
                    'draft',
                    'sent',
                    'partially_paid',
                    'paid',
                    'overdue',
                ]),
            ],
            'from_date' => ['nullable', 'date'],
            'to_date' => [
                'nullable',
                'date',
                'after_or_equal:from_date',
            ],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Invoice::where('business_profile_id', $businessId)
            ->with('items:id,invoice_id,description,quantity,unit,unit_price,discount,tax_rate,tax_amount,line_total');

        if (!empty($validated['search'])) {
            $search = trim($validated['search']);

            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['status'])) {
            if ($validated['status'] === 'overdue') {
                $query->where('status', 'overdue');
            } else {
                $query->where('status', $validated['status']);
            }
        }

        if (!empty($validated['from_date'])) {
            $query->whereDate(
                'invoice_date',
                '>=',
                $validated['from_date']
            );
        }

        if (!empty($validated['to_date'])) {
            $query->whereDate(
                'invoice_date',
                '<=',
                $validated['to_date']
            );
        }

        $invoices = $query
            ->latest('invoice_date')
            ->latest('id')
            ->paginate($validated['per_page'] ?? 10);

        return response()->json([
            'invoices' => $invoices,
        ]);
    }

    /**
     * Create invoice.
     */
    public function store(Request $request, int $businessId)
    {
        $this->getBusiness($request, $businessId);

        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer'],
            'customer_name' => [
                'required_without:customer_id',
                'nullable',
                'string',
                'max:255',
            ],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:20'],
            'customer_gstin' => [
                'nullable',
                'string',
                'size:15',
                'regex:/^[0-9A-Z]{15}$/i',
            ],
            'billing_address' => ['nullable', 'string', 'max:5000'],

            'invoice_date' => ['required', 'date'],
            'due_date' => [
                'nullable',
                'date',
                'after_or_equal:invoice_date',
            ],

            'discount' => ['nullable', 'numeric', 'min:0'],

            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit' => ['nullable', 'string', 'max:30'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
            'items.*.tax_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],

            'status' => ['nullable', Rule::in(['draft', 'sent'])],
            'notes' => ['nullable', 'string', 'max:10000'],
            'terms' => ['nullable', 'string', 'max:10000'],
        ]);

        $business = null;

        $invoice = DB::transaction(function () use (
            $request,
            $businessId,
            $validated,
            &$business
        ) {
            // Lock business row to prevent duplicate invoice numbers.
            $business = BusinessProfile::where('id', $businessId)
                ->lockForUpdate()
                ->firstOrFail();

            $customer = $this->validateCustomer(
                $businessId,
                $validated['customer_id'] ?? null
            );

            $totals = $this->calculateTotals(
                $validated['items'],
                (float) ($validated['discount'] ?? 0)
            );

            $invoiceNumber = $this->generateInvoiceNumber($business);

            $invoice = Invoice::create([
                'business_profile_id' => $businessId,
                'customer_id' => $customer?->id,
                'invoice_number' => $invoiceNumber,

                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'] ?? null,

                'customer_name' => $customer?->name
                    ?? $validated['customer_name'],

                'customer_email' => $customer?->email
                    ?? ($validated['customer_email'] ?? null),

                'customer_phone' => $customer?->phone
                    ?? ($validated['customer_phone'] ?? null),

                'customer_gstin' => $customer?->gstin
                    ?? ($validated['customer_gstin'] ?? null),

                'billing_address' => $customer?->billing_address
                    ?? ($validated['billing_address'] ?? null),

                'subtotal' => $totals['subtotal'],
                'discount' => $totals['discount'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'amount_paid' => 0,
                'balance_due' => $totals['total'],

                'currency' => $business->currency,
                'status' => $validated['status'] ?? 'draft',

                'notes' => $validated['notes'] ?? null,
                'terms' => $validated['terms'] ?? null,
            ]);

            $this->syncInvoiceItems($invoice, $totals['items']);

            $business->increment('next_invoice_number');

            return $invoice;
        });

        return response()->json([
            'message' => 'Invoice created successfully.',
            'invoice' => $invoice->load('items'),
        ], 201);
    }

    /**
     * Show invoice.
     */
    public function show(Request $request, int $businessId, int $invoiceId)
    {
        $this->getBusiness($request, $businessId);

        $invoice = $this->getInvoice(
            $businessId,
            $invoiceId,
            true
        );

        return response()->json([
            'invoice' => $invoice,
        ]);
    }

    /**
     * Update invoice.
     */
    public function update(
        Request $request,
        int $businessId,
        int $invoiceId
    ) {
        $this->getBusiness($request, $businessId);

        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer'],
            'customer_name' => [
                'required_without:customer_id',
                'nullable',
                'string',
                'max:255',
            ],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'customer_phone' => ['nullable', 'string', 'max:20'],
            'customer_gstin' => [
                'nullable',
                'string',
                'size:15',
                'regex:/^[0-9A-Z]{15}$/i',
            ],
            'billing_address' => ['nullable', 'string', 'max:5000'],

            'invoice_date' => ['required', 'date'],
            'due_date' => [
                'nullable',
                'date',
                'after_or_equal:invoice_date',
            ],

            'discount' => ['nullable', 'numeric', 'min:0'],

            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.unit' => ['nullable', 'string', 'max:30'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
            'items.*.tax_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],

            'status' => ['nullable', Rule::in(['draft', 'sent'])],
            'notes' => ['nullable', 'string', 'max:10000'],
            'terms' => ['nullable', 'string', 'max:10000'],
        ]);

        $invoice = DB::transaction(function () use (
            $businessId,
            $invoiceId,
            $validated
        ) {
            $invoice = Invoice::where('business_profile_id', $businessId)
                ->where('id', $invoiceId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($invoice->payments()->exists()) {
                throw ValidationException::withMessages([
                    'invoice' => [
                        'This invoice cannot be edited because payments have already been recorded.',
                    ],
                ]);
            }

            $customer = $this->validateCustomer(
                $businessId,
                $validated['customer_id'] ?? null
            );

            $totals = $this->calculateTotals(
                $validated['items'],
                (float) ($validated['discount'] ?? 0)
            );

            $invoice->update([
                'customer_id' => $customer?->id,

                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'] ?? null,

                'customer_name' => $customer?->name
                    ?? $validated['customer_name'],

                'customer_email' => $customer?->email
                    ?? ($validated['customer_email'] ?? null),

                'customer_phone' => $customer?->phone
                    ?? ($validated['customer_phone'] ?? null),

                'customer_gstin' => $customer?->gstin
                    ?? ($validated['customer_gstin'] ?? null),

                'billing_address' => $customer?->billing_address
                    ?? ($validated['billing_address'] ?? null),

                'subtotal' => $totals['subtotal'],
                'discount' => $totals['discount'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'amount_paid' => 0,
                'balance_due' => $totals['total'],

                'status' => $validated['status']
                    ?? $invoice->status,

                'notes' => $validated['notes'] ?? null,
                'terms' => $validated['terms'] ?? null,
            ]);

            $this->syncInvoiceItems($invoice, $totals['items']);

            return $invoice;
        });

        return response()->json([
            'message' => 'Invoice updated successfully.',
            'invoice' => $invoice->fresh()->load('items'),
        ]);
    }

    /**
     * Delete invoice.
     */
    public function destroy(
        Request $request,
        int $businessId,
        int $invoiceId
    ) {
        $this->getBusiness($request, $businessId);

        $invoice = $this->getInvoice($businessId, $invoiceId);

        if ($invoice->payments()->exists()) {
            return response()->json([
                'message' => 'This invoice cannot be deleted because payments have been recorded.',
            ], 422);
        }

        if ($invoice->status !== 'draft') {
            return response()->json([
                'message' => 'Only draft invoices can be deleted.',
            ], 422);
        }

        $invoice->delete();

        return response()->json([
            'message' => 'Invoice deleted successfully.',
        ]);
    }
}