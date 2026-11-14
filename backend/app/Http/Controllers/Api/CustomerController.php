<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CustomerController extends Controller
{
    /**
     * Verify that the authenticated user has active access
     * to the requested business.
     */
    private function hasBusinessAccess(Request $request, int $businessId): bool
    {
        return $request->user()
            ->activeBusinessProfiles()
            ->where('business_profiles.id', $businessId)
            ->exists();
    }

    /**
     * Validate customer data and handle Indian state/GSTIN details.
     */
    private function validateCustomerData(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'gstin' => [
                'nullable',
                'string',
                'max:15',
                'regex:/^[0-9A-Z]{15}$/i',
            ],
            'state' => ['nullable', 'string', 'max:100'],
            'state_code' => [
                'nullable',
                'string',
                'size:2',
                Rule::in(array_column(config('indian_states'), 'code')),
                'required_with:gstin',
            ],
            'billing_address' => ['nullable', 'string', 'max:2000'],
            'shipping_address' => ['nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        if (!empty($validated['state_code'])) {
            $state = collect(config('indian_states'))
                ->firstWhere('code', $validated['state_code']);

            if (!$state) {
                throw ValidationException::withMessages([
                    'state_code' => [
                        'Please select a valid Indian state.',
                    ],
                ]);
            }

            $validated['state'] = $state['name'];
        } else {
            $validated['state'] = null;
            $validated['state_code'] = null;
        }

        if (!empty($validated['gstin'])) {
            $validated['gstin'] = strtoupper($validated['gstin']);

            $gstinStateCode = substr($validated['gstin'], 0, 2);

            if ($gstinStateCode !== $validated['state_code']) {
                throw ValidationException::withMessages([
                    'gstin' => [
                        'The GSTIN state code does not match the selected customer state.',
                    ],
                ]);
            }
        }

        return $validated;
    }

    /**
     * Return customers belonging to a business.
     */
    public function index(Request $request, int $businessId)
    {
        if (!$this->hasBusinessAccess($request, $businessId)) {
            return response()->json([
                'message' => 'Business not found or access denied.',
            ], 404);
        }

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Customer::where('business_profile_id', $businessId);

        if (!empty($validated['search'])) {
            $search = trim($validated['search']);

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%");
            });
        }

        $customers = $query
            ->latest('id')
            ->paginate($validated['per_page'] ?? 10);

        return response()->json([
            'customers' => $customers,
        ]);
    }

    /**
     * Create a customer.
     */
    public function store(Request $request, int $businessId)
    {
        if (!$this->hasBusinessAccess($request, $businessId)) {
            return response()->json([
                'message' => 'Business not found or access denied.',
            ], 404);
        }

        $validated = $this->validateCustomerData($request);

        $customer = Customer::create([
            ...$validated,
            'business_profile_id' => $businessId,
        ]);

        return response()->json([
            'message' => 'Customer created successfully.',
            'customer' => $customer,
        ], 201);
    }

    /**
     * Show a single customer.
     */
    public function show(
        Request $request,
        int $businessId,
        int $customerId
    ) {
        if (!$this->hasBusinessAccess($request, $businessId)) {
            return response()->json([
                'message' => 'Business not found or access denied.',
            ], 404);
        }

        $customer = Customer::where('business_profile_id', $businessId)
            ->where('id', $customerId)
            ->first();

        if (!$customer) {
            return response()->json([
                'message' => 'Customer not found.',
            ], 404);
        }

        return response()->json([
            'customer' => $customer,
        ]);
    }

    /**
     * Update a customer.
     */
    public function update(
        Request $request,
        int $businessId,
        int $customerId
    ) {
        if (!$this->hasBusinessAccess($request, $businessId)) {
            return response()->json([
                'message' => 'Business not found or access denied.',
            ], 404);
        }

        $customer = Customer::where('business_profile_id', $businessId)
            ->where('id', $customerId)
            ->first();

        if (!$customer) {
            return response()->json([
                'message' => 'Customer not found.',
            ], 404);
        }

        $validated = $this->validateCustomerData($request);

        $customer->update($validated);

        return response()->json([
            'message' => 'Customer updated successfully.',
            'customer' => $customer->fresh(),
        ]);
    }

    /**
     * Delete a customer.
     */
    public function destroy(
        Request $request,
        int $businessId,
        int $customerId
    ) {
        if (!$this->hasBusinessAccess($request, $businessId)) {
            return response()->json([
                'message' => 'Business not found or access denied.',
            ], 404);
        }

        $customer = Customer::where('business_profile_id', $businessId)
            ->where('id', $customerId)
            ->first();

        if (!$customer) {
            return response()->json([
                'message' => 'Customer not found.',
            ], 404);
        }

        // Prevent deleting customers already linked to invoices or quotations.
        if (
            $customer->invoices()->exists() ||
            $customer->quotations()->exists()
        ) {
            return response()->json([
                'message' => 'This customer cannot be deleted because invoices or quotations are linked to it.',
            ], 422);
        }

        $customer->delete();

        return response()->json([
            'message' => 'Customer deleted successfully.',
        ]);
    }
}