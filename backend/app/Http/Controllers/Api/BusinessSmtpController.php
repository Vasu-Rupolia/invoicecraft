<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Throwable;

class BusinessSmtpController extends Controller
{
    private function getOwnedBusiness(
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

        if ($business->pivot->role !== 'owner') {
            abort(403, 'Only the business owner can manage SMTP settings.');
        }

        return $business;
    }

    private function smtpResponse(BusinessProfile $business): array
    {
        return [
            'smtp_host' => $business->smtp_host,
            'smtp_port' => $business->smtp_port,
            'smtp_username' => $business->smtp_username,
            'smtp_encryption' => $business->smtp_encryption,
            'smtp_from_address' => $business->smtp_from_address,
            'smtp_from_name' => $business->smtp_from_name,
            'has_password' => !empty($business->smtp_password),
            'is_configured' => !empty($business->smtp_host)
                && !empty($business->smtp_port)
                && !empty($business->smtp_from_address),
        ];
    }

    public function show(
        Request $request,
        int $businessId
    ): JsonResponse {
        $business = $this->getOwnedBusiness($request, $businessId);

        return response()->json([
            'smtp' => $this->smtpResponse($business),
        ]);
    }

    public function update(
        Request $request,
        int $businessId
    ): JsonResponse {
        $business = $this->getOwnedBusiness($request, $businessId);

        $data = $request->validate([
            'smtp_host' => ['required', 'string', 'max:255'],
            'smtp_port' => ['required', 'integer', 'between:1,65535'],
            'smtp_username' => ['nullable', 'string', 'max:255'],
            'smtp_password' => ['nullable', 'string', 'max:1000'],
            'smtp_encryption' => [
                'nullable',
                Rule::in(['tls', 'ssl']),
            ],
            'smtp_from_address' => [
                'required',
                'email',
                'max:255',
            ],
            'smtp_from_name' => ['nullable', 'string', 'max:255'],
        ]);

        if (
            !empty($data['smtp_username'])
            && empty($data['smtp_password'])
            && empty($business->smtp_password)
        ) {
            return response()->json([
                'message' => 'SMTP password is required when authentication is enabled.',
                'errors' => [
                    'smtp_password' => [
                        'Please provide the SMTP password.',
                    ],
                ],
            ], 422);
        }

        if (empty($data['smtp_password'])) {
            unset($data['smtp_password']);
        }

        $business->fill($data);
        $business->save();

        return response()->json([
            'message' => 'SMTP settings saved successfully.',
            'smtp' => $this->smtpResponse($business->fresh()),
        ]);
    }

    public function testConnection(
        Request $request,
        int $businessId
    ): JsonResponse {
        $business = $this->getOwnedBusiness($request, $businessId);

        if (
            empty($business->smtp_host)
            || empty($business->smtp_port)
            || empty($business->smtp_from_address)
        ) {
            return response()->json([
                'message' => 'Please save complete SMTP settings before testing the connection.',
            ], 422);
        }

        try {
            $scheme = $business->smtp_encryption === 'ssl'
                ? 'smtps'
                : 'smtp';

            $mailer = Mail::build([
                'transport' => 'smtp',
                'scheme' => $scheme,
                'host' => $business->smtp_host,
                'port' => $business->smtp_port,
                'username' => $business->smtp_username,
                'password' => $business->smtp_password,
                'timeout' => 15,
                'local_domain' => parse_url(
                    (string) config('app.url'),
                    PHP_URL_HOST
                ),
            ]);

            $transport = $mailer->getSymfonyTransport();

            $transport->start();
            $transport->stop();

            return response()->json([
                'message' => 'SMTP connection successful.',
                'connected' => true,
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'SMTP connection failed. Please verify your host, port, encryption and login credentials.',
                'connected' => false,
            ], 422);
        }
    }

    public function destroy(
        Request $request,
        int $businessId
    ): JsonResponse {
        $business = $this->getOwnedBusiness($request, $businessId);

        $business->forceFill([
            'smtp_host' => null,
            'smtp_port' => null,
            'smtp_username' => null,
            'smtp_password' => null,
            'smtp_encryption' => null,
            'smtp_from_address' => null,
            'smtp_from_name' => null,
        ])->save();

        return response()->json([
            'message' => 'SMTP settings removed successfully.',
            'smtp' => $this->smtpResponse($business->fresh()),
        ]);
    }
}