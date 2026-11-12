<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'business_name' => ['required', 'string', 'max:255'],
            'business_type' => ['nullable', 'string', 'max:50'],
        ]);

        $result = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            $business = BusinessProfile::create([
                'name' => $data['business_name'],
                'business_type' => $data['business_type'] ?? 'freelancer',
            ]);

            $user->businessProfiles()->attach($business->id, [
                'role' => 'owner',
                'status' => 'active',
            ]);

            $token = $user->createToken('invoicecraft-web')->plainTextToken;

            return compact('user', 'business', 'token');
        });

        return response()->json([
            'message' => 'Account created successfully.',
            'token' => $result['token'],
            'user' => $result['user'],
            'business' => $result['business'],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('invoicecraft-web')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => $user,
            'businesses' => $user->activeBusinessProfiles()->get(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $user,
            'businesses' => $user->activeBusinessProfiles()->get(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function businesses(Request $request): JsonResponse
    {
        return response()->json([
            'businesses' => $request->user()
                ->activeBusinessProfiles()
                ->get(),
        ]);
    }

    public function createBusiness(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'business_type' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'gstin' => ['nullable', 'string', 'size:15'],
        ]);

        $business = DB::transaction(function () use ($request, $data) {
            $business = BusinessProfile::create($data);

            $request->user()->businessProfiles()->attach($business->id, [
                'role' => 'owner',
                'status' => 'active',
            ]);

            return $business;
        });

        return response()->json([
            'message' => 'Business created successfully.',
            'business' => $business,
        ], 201);
    }

    public function switchBusiness(Request $request, int $businessId): JsonResponse
    {
        $business = $request->user()
            ->activeBusinessProfiles()
            ->where('business_profiles.id', $businessId)
            ->first();

        if (!$business) {
            return response()->json([
                'message' => 'Business not found or access denied.',
            ], 404);
        }

        return response()->json([
            'message' => 'Business switched successfully.',
            'business' => $business,
        ]);
    }
}