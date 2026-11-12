<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Quotation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class QuotationController extends Controller
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

    private function getQuotation(
        int $businessId,
        int $quotationId,
        bool $withRelations = false
    ): Quotation {
        $query = Quotation::where(
            'business_profile_id',
            $businessId
        )->where('id', $quotationId);

        if ($withRelations) {
            $query->with('items');
        }

        $quotation = $query->first();

        if (!$quotation) {
            abort(404, 'Quotation not found.');
        }

        return $quotation;
    }

    private function validateCustomer(
        int $businessId,
        ?int $customerId
    ): ?Customer {
        if (!$customerId) {
            return null;
        }

        $customer = Customer::where(
            'business_profile_id',
            $businessId
        )
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

    private function calculateTotals(
        array $items,
        float $invoiceDiscount
    ): array {
        $subtotal = 0;
        $itemDiscountTotal = 0;
        $bases = [];

        foreach ($items as $index => $item) {
            $gross = round(
                (float) $item['quantity'] *
                (float) $item['unit_price'],
                2
            );

            $discount = round(
                (float) ($item['discount'] ?? 0),
                2
            );

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
            $bases[] = $base;
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
                    'Quotation discount cannot exceed the amount after item discounts.',
                ],
            ]);
        }

        $remainingTaxable = round(
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
            $base = $bases[$index];

            if ($index === $lastIndex) {
                $allocatedDiscount = round(
                    $invoiceDiscount - $distributedDiscount,
                    2
                );
            } elseif ($taxableSubtotal > 0) {
                $allocatedDiscount = round(
                    $invoiceDiscount *
                    ($base / $taxableSubtotal),
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

        return [
            'subtotal' => $subtotal,
            'discount' => $totalDiscount,
            'tax_amount' => $taxAmount,
            'total' => round(
                $remainingTaxable + $taxAmount,
                2
            ),
            'items' => $calculatedItems,
        ];
    }

    private function syncQuotationItems(
        Quotation $quotation,
        array $items
    ): void {
        $quotation->items()->delete();

        foreach ($items as $item) {
            $quotation->items()->create($item);
        }
    }

    private function generateQuotationNumber(
        BusinessProfile $business
    ): string {
        return $business->quotation_prefix . '-' . str_pad(
            (string) $business->next_quotation_number,
            5,
            '0',
            STR_PAD_LEFT
        );
    }

    private function generateInvoiceNumber(
        BusinessProfile $business
    ): string {
        return $business->invoice_prefix . '-' . str_pad(
            (string) $business->next_invoice_number,
            5,
            '0',
            STR_PAD_LEFT
        );
    }

    /**
     * List quotations.
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
                    'accepted',
                    'rejected',
                    'expired',
                    'converted',
                ]),
            ],
            'from_date' => ['nullable', 'date'],
            'to_date' => [
                'nullable',
                'date',
                'after_or_equal:from_date',
            ],
            'per_page' => [
                'nullable',
                'integer',
                'min:1',
                'max:100',
            ],
        ]);

        $query = Quotation::where(
            'business_profile_id',
            $businessId
        )->with('items');

        if (!empty($validated['search'])) {
            $search = trim($validated['search']);

            $query->where(function ($q) use ($search) {
                $q->where('quotation_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (!empty($validated['from_date'])) {
            $query->whereDate(
                'quotation_date',
                '>=',
                $validated['from_date']
            );
        }

        if (!empty($validated['to_date'])) {
            $query->whereDate(
                'quotation_date',
                '<=',
                $validated['to_date']
            );
        }

        $quotations = $query
            ->latest('quotation_date')
            ->latest('id')
            ->paginate($validated['per_page'] ?? 10);

        return response()->json([
            'quotations' => $quotations,
        ]);
    }

    /**
     * Create quotation.
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

            'customer_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'customer_phone' => [
                'nullable',
                'string',
                'max:20',
            ],

            'customer_gstin' => [
                'nullable',
                'string',
                'size:15',
                'regex:/^[0-9A-Z]{15}$/i',
            ],

            'billing_address' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'quotation_date' => ['required', 'date'],

            'valid_until' => [
                'nullable',
                'date',
                'after_or_equal:quotation_date',
            ],

            'discount' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            'items.*.description' => [
                'required',
                'string',
                'max:255',
            ],

            'items.*.quantity' => [
                'required',
                'numeric',
                'gt:0',
            ],

            'items.*.unit' => [
                'nullable',
                'string',
                'max:30',
            ],

            'items.*.unit_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            'items.*.discount' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'items.*.tax_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],

            'status' => [
                'nullable',
                Rule::in(['draft', 'sent']),
            ],

            'notes' => [
                'nullable',
                'string',
                'max:10000',
            ],

            'terms' => [
                'nullable',
                'string',
                'max:10000',
            ],
        ]);

        $quotation = DB::transaction(function () use (
            $businessId,
            $validated
        ) {
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

            $quotation = Quotation::create([
                'business_profile_id' => $businessId,
                'customer_id' => $customer?->id,

                'quotation_number' => $this->generateQuotationNumber(
                    $business
                ),

                'quotation_date' => $validated['quotation_date'],
                'valid_until' => $validated['valid_until'] ?? null,

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

                'currency' => $business->currency,
                'status' => $validated['status'] ?? 'draft',

                'notes' => $validated['notes'] ?? null,
                'terms' => $validated['terms'] ?? null,
            ]);

            $this->syncQuotationItems(
                $quotation,
                $totals['items']
            );

            $business->increment('next_quotation_number');

            return $quotation;
        });

        return response()->json([
            'message' => 'Quotation created successfully.',
            'quotation' => $quotation->load('items'),
        ], 201);
    }

    /**
     * Show quotation.
     */
    public function show(
        Request $request,
        int $businessId,
        int $quotationId
    ) {
        $this->getBusiness($request, $businessId);

        $quotation = $this->getQuotation(
            $businessId,
            $quotationId,
            true
        );

        return response()->json([
            'quotation' => $quotation,
        ]);
    }

    /**
     * Update quotation.
     */
    public function update(
        Request $request,
        int $businessId,
        int $quotationId
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

            'customer_email' => [
                'nullable',
                'email',
                'max:255',
            ],

            'customer_phone' => [
                'nullable',
                'string',
                'max:20',
            ],

            'customer_gstin' => [
                'nullable',
                'string',
                'size:15',
                'regex:/^[0-9A-Z]{15}$/i',
            ],

            'billing_address' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'quotation_date' => ['required', 'date'],

            'valid_until' => [
                'nullable',
                'date',
                'after_or_equal:quotation_date',
            ],

            'discount' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'items' => [
                'required',
                'array',
                'min:1',
                'max:100',
            ],

            'items.*.description' => [
                'required',
                'string',
                'max:255',
            ],

            'items.*.quantity' => [
                'required',
                'numeric',
                'gt:0',
            ],

            'items.*.unit' => [
                'nullable',
                'string',
                'max:30',
            ],

            'items.*.unit_price' => [
                'required',
                'numeric',
                'min:0',
            ],

            'items.*.discount' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'items.*.tax_rate' => [
                'nullable',
                'numeric',
                'min:0',
                'max:100',
            ],

            'status' => [
                'nullable',
                Rule::in(['draft', 'sent']),
            ],

            'notes' => [
                'nullable',
                'string',
                'max:10000',
            ],

            'terms' => [
                'nullable',
                'string',
                'max:10000',
            ],
        ]);

        $quotation = DB::transaction(function () use (
            $businessId,
            $quotationId,
            $validated
        ) {
            $quotation = Quotation::where(
                'business_profile_id',
                $businessId
            )
                ->where('id', $quotationId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($quotation->status === 'converted') {
                throw ValidationException::withMessages([
                    'quotation' => [
                        'A converted quotation cannot be edited.',
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

            $quotation->update([
                'customer_id' => $customer?->id,

                'quotation_date' => $validated['quotation_date'],
                'valid_until' => $validated['valid_until'] ?? null,

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

                'status' => $validated['status']
                    ?? $quotation->status,

                'notes' => $validated['notes'] ?? null,
                'terms' => $validated['terms'] ?? null,
            ]);

            $this->syncQuotationItems(
                $quotation,
                $totals['items']
            );

            return $quotation;
        });

        return response()->json([
            'message' => 'Quotation updated successfully.',
            'quotation' => $quotation->fresh()->load('items'),
        ]);
    }

    /**
     * Convert quotation into an invoice.
     */
    public function convertToInvoice(
        Request $request,
        int $businessId,
        int $quotationId
    ) {
        $this->getBusiness($request, $businessId);

        $invoice = DB::transaction(function () use (
            $businessId,
            $quotationId
        ) {
            $business = BusinessProfile::where('id', $businessId)
                ->lockForUpdate()
                ->firstOrFail();

            $quotation = Quotation::where(
                'business_profile_id',
                $businessId
            )
                ->where('id', $quotationId)
                ->lockForUpdate()
                ->with('items')
                ->firstOrFail();

            if ($quotation->status === 'converted') {
                throw ValidationException::withMessages([
                    'quotation' => [
                        'This quotation has already been converted into an invoice.',
                    ],
                ]);
            }

            if (in_array($quotation->status, ['rejected', 'expired'], true)) {
                throw ValidationException::withMessages([
                    'quotation' => [
                        'Rejected or expired quotations cannot be converted.',
                    ],
                ]);
            }

            if ($quotation->items->isEmpty()) {
                throw ValidationException::withMessages([
                    'quotation' => [
                        'This quotation has no items.',
                    ],
                ]);
            }

            $invoiceNumber = $this->generateInvoiceNumber($business);

            $invoice = Invoice::create([
                'business_profile_id' => $businessId,
                'customer_id' => $quotation->customer_id,
                'invoice_number' => $invoiceNumber,

                'invoice_date' => now()->toDateString(),
                'due_date' => null,

                'customer_name' => $quotation->customer_name,
                'customer_email' => $quotation->customer_email,
                'customer_phone' => $quotation->customer_phone,
                'customer_gstin' => $quotation->customer_gstin,
                'billing_address' => $quotation->billing_address,

                'subtotal' => $quotation->subtotal,
                'discount' => $quotation->discount,
                'tax_amount' => $quotation->tax_amount,
                'total' => $quotation->total,
                'amount_paid' => 0,
                'balance_due' => $quotation->total,

                'currency' => $quotation->currency,
                'status' => 'draft',

                'notes' => $quotation->notes,
                'terms' => $quotation->terms,
            ]);

            foreach ($quotation->items as $item) {
                $invoice->items()->create([
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit' => $item->unit,
                    'unit_price' => $item->unit_price,
                    'discount' => $item->discount,
                    'tax_rate' => $item->tax_rate,
                    'tax_amount' => $item->tax_amount,
                    'line_total' => $item->line_total,
                ]);
            }

            $quotation->update([
                'status' => 'converted',
            ]);

            $business->increment('next_invoice_number');

            return $invoice;
        });

        return response()->json([
            'message' => 'Quotation converted into invoice successfully.',
            'invoice' => $invoice->fresh()->load('items'),
        ], 201);
    }

    /**
     * Delete quotation.
     */
    public function destroy(
        Request $request,
        int $businessId,
        int $quotationId
    ) {
        $this->getBusiness($request, $businessId);

        DB::transaction(function () use (
            $businessId,
            $quotationId
        ) {
            $quotation = Quotation::where(
                'business_profile_id',
                $businessId
            )
                ->where('id', $quotationId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($quotation->status === 'converted') {
                throw ValidationException::withMessages([
                    'quotation' => [
                        'A converted quotation cannot be deleted.',
                    ],
                ]);
            }

            $quotation->delete();
        });

        return response()->json([
            'message' => 'Quotation deleted successfully.',
        ]);
    }
}