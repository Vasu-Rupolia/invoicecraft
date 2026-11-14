<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BusinessProfileController extends Controller
{
    private function getOwnedBusiness(Request $request, int $businessId): BusinessProfile
    {
        $business = $request->user()
            ->activeBusinessProfiles()
            ->where('business_profiles.id', $businessId)
            ->first();

        if (!$business) {
            abort(404, 'Business not found or access denied.');
        }

        if ($business->pivot->role !== 'owner') {
            abort(403, 'Only the business owner can update business settings.');
        }

        return $business;
    }

    public function show(Request $request, int $businessId): JsonResponse
    {
        $business = $this->getOwnedBusiness($request, $businessId);

        return response()->json([
            'business' => $business,
        ]);
    }

    public function update(Request $request, int $businessId): JsonResponse
    {
        $business = $this->getOwnedBusiness($request, $businessId);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'business_type' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'state_code' => [
                'required',
                'string',
                'size:2',
                Rule::in(array_column(config('indian_states'), 'code')),
            ],
            'country' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'gstin' => [
                'nullable',
                'string',
                'size:15',
                'regex:/^[0-9A-Z]{15}$/i',
            ],
            'currency' => ['nullable', 'string', 'size:3'],
            'timezone' => ['nullable', 'string', 'max:100'],
            'invoice_prefix' => ['nullable', 'string', 'max:20'],
            'quotation_prefix' => ['nullable', 'string', 'max:20'],
            'logo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:4096',
            ],
        ]);

        $state = collect(config('indian_states'))
            ->firstWhere('code', $data['state_code']);

        if (!$state) {
            throw ValidationException::withMessages([
                'state_code' => [
                    'Please select a valid Indian state.',
                ],
            ]);
        }

        if (!empty($data['gstin'])) {
            $gstinStateCode = substr(
                strtoupper($data['gstin']),
                0,
                2
            );

            if ($gstinStateCode !== $data['state_code']) {
                throw ValidationException::withMessages([
                    'gstin' => [
                        'The GSTIN state code does not match the selected business state.',
                    ],
                ]);
            }
        }

        $data['state'] = $state['name'];
        $data['country'] = $data['country'] ?? 'India';

        unset($data['logo']);

        $oldLogo = $business->logo_path;
        $newLogo = null;

        if ($request->hasFile('logo')) {
            $newLogo = $request->file('logo')
                ->store('business-logos', 'public');

            $business->logo_path = $newLogo;
        }

        $business->fill($data);
        $business->save();

        if ($newLogo && $oldLogo) {
            Storage::disk('public')->delete($oldLogo);
        }

        return response()->json([
            'message' => 'Business profile updated successfully.',
            'business' => $business->fresh(),
        ]);
    }

    public function deleteLogo(Request $request, int $businessId): JsonResponse
    {
        $business = $this->getOwnedBusiness($request, $businessId);

        if ($business->logo_path) {
            Storage::disk('public')->delete($business->logo_path);

            $business->logo_path = null;
            $business->save();
        }

        return response()->json([
            'message' => 'Business logo removed successfully.',
            'business' => $business->fresh(),
        ]);
    }
}