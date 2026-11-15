<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class BusinessProfile extends Model
{
    protected $fillable = [
        'name',
        'business_type',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'state_code',
        'country',
        'postal_code',
        'gstin',
        'logo_path',
        'currency',
        'invoice_prefix',
        'next_invoice_number',
        'quotation_prefix',
        'next_quotation_number',
        'timezone',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_encryption',
        'smtp_from_address',
        'smtp_from_name',
    ];

    protected $hidden = [
        'smtp_password',
    ];

    protected $appends = [
        'logo_url',
    ];

    protected function casts(): array
    {
        return [
            'next_invoice_number' => 'integer',
            'next_quotation_number' => 'integer',
            'smtp_port' => 'integer',
            'smtp_password' => 'encrypted',
        ];
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path
            ? Storage::disk('public')->url($this->logo_path)
            : null;
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'business_profile_user'
        )
            ->withPivot(['role', 'status'])
            ->withTimestamps();
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}