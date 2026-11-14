<?php

namespace App\Services;

use InvalidArgumentException;

class GstCalculationService
{
    public function calculate(
        float $taxableAmount,
        float $taxRate,
        string $supplierStateCode,
        string $placeOfSupplyStateCode
    ): array {
        if (
            !preg_match('/^\d{2}$/', $supplierStateCode) ||
            !preg_match('/^\d{2}$/', $placeOfSupplyStateCode)
        ) {
            throw new InvalidArgumentException(
                'Valid supplier and place of supply state codes are required.'
            );
        }

        if ($taxableAmount < 0 || $taxRate < 0 || $taxRate > 100) {
            throw new InvalidArgumentException(
                'Invalid taxable amount or GST rate.'
            );
        }

        $taxAmount = round(
            $taxableAmount * $taxRate / 100,
            2
        );

        $cgstAmount = 0;
        $sgstAmount = 0;
        $igstAmount = 0;

        if ($supplierStateCode === $placeOfSupplyStateCode) {
            // Intra-state supply: CGST + SGST
            $cgstAmount = round($taxAmount / 2, 2);
            $sgstAmount = round($taxAmount - $cgstAmount, 2);

            $taxType = 'cgst_sgst';
        } else {
            // Inter-state supply: IGST
            $igstAmount = $taxAmount;

            $taxType = 'igst';
        }

        return [
            'tax_type' => $taxType,
            'tax_amount' => $taxAmount,
            'cgst_amount' => $cgstAmount,
            'sgst_amount' => $sgstAmount,
            'igst_amount' => $igstAmount,
        ];
    }
}