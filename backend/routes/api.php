<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BusinessProfileController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\QuotationController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Authenticated routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/me', [AuthController::class, 'me']);

    // Personal profile
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile', [ProfileController::class, 'update']);
    Route::delete('/profile/avatar', [ProfileController::class, 'deleteAvatar']);

    // Business management
    Route::get('/businesses', [AuthController::class, 'businesses']);
    Route::post('/businesses', [AuthController::class, 'createBusiness']);

    Route::post(
        '/businesses/{businessId}/switch',
        [AuthController::class, 'switchBusiness']
    );

    // Business profile and logo
    Route::get(
        '/businesses/{businessId}/profile',
        [BusinessProfileController::class, 'show']
    );

    Route::post(
        '/businesses/{businessId}/profile',
        [BusinessProfileController::class, 'update']
    );

    Route::delete(
        '/businesses/{businessId}/profile/logo',
        [BusinessProfileController::class, 'deleteLogo']
    );

    // Dashboard
    Route::get(
        '/businesses/{businessId}/dashboard',
        [DashboardController::class, 'index']
    );

    // Customers
    Route::prefix('businesses/{businessId}/customers')->group(function () {
        Route::get('/', [CustomerController::class, 'index']);
        Route::post('/', [CustomerController::class, 'store']);
        Route::get('/{customerId}', [CustomerController::class, 'show']);
        Route::put('/{customerId}', [CustomerController::class, 'update']);
        Route::delete('/{customerId}', [CustomerController::class, 'destroy']);
    });

    // Invoices
    Route::prefix('businesses/{businessId}/invoices')->group(function () {
        Route::get('/', [InvoiceController::class, 'index']);
        Route::post('/', [InvoiceController::class, 'store']);
        Route::get('/{invoiceId}', [InvoiceController::class, 'show']);
        Route::put('/{invoiceId}', [InvoiceController::class, 'update']);
        Route::delete('/{invoiceId}', [InvoiceController::class, 'destroy']);

        // Invoice payments
        Route::get(
            '/{invoiceId}/payments',
            [PaymentController::class, 'index']
        );

        Route::post(
            '/{invoiceId}/payments',
            [PaymentController::class, 'store']
        );
    });

    // Delete payment
    Route::delete(
        '/businesses/{businessId}/payments/{paymentId}',
        [PaymentController::class, 'destroy']
    );

    // Quotations
    Route::prefix('businesses/{businessId}/quotations')->group(function () {
        Route::get('/', [QuotationController::class, 'index']);
        Route::post('/', [QuotationController::class, 'store']);

        Route::post(
            '/{quotationId}/convert-to-invoice',
            [QuotationController::class, 'convertToInvoice']
        );

        Route::get('/{quotationId}', [QuotationController::class, 'show']);
        Route::put('/{quotationId}', [QuotationController::class, 'update']);
        Route::delete('/{quotationId}', [QuotationController::class, 'destroy']);
    });
});