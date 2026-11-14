<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quotation extends Model
{
    protected $fillable = [
        'business_profile_id',
        'customer_id',
        'quotation_number',
        'quotation_date',
        'valid_until',
        'customer_name',
        'customer_email',
        'customer_phone',
        'customer_gstin',
        'billing_address',
        'subtotal',
        'discount',
        'tax_amount',
        'cgst_amount',
        'sgst_amount',
        'igst_amount',
        'tax_type',
        'place_of_supply_state',
        'place_of_supply_state_code',
        'total',
        'currency',
        'status',
        'notes',
        'terms',
    ];

    protected function casts(): array
    {
        return [
            'quotation_date' => 'date',
            'valid_until' => 'date',
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'cgst_amount' => 'decimal:2',
            'sgst_amount' => 'decimal:2',
            'igst_amount' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function businessProfile(): BelongsTo
    {
        return $this->belongsTo(BusinessProfile::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }
}