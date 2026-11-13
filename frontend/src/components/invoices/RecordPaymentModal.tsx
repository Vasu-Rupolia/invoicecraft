import { useState, type FormEvent } from "react";
import { CalendarDays, IndianRupee, Loader2, X } from "lucide-react";
import type {
  Invoice,
  PaymentMethod,
  PaymentPayload,
} from "../../types";
import {
  createPayment,
  type CreatePaymentResponse,
} from "../../services/invoiceService";

type RecordPaymentModalProps = {
  businessId: number;
  invoice: Invoice;
  onClose: () => void;
  onSuccess: (updatedInvoice: Invoice) => void;
};

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const getLocalDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatCurrency = (amount: number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);

const getErrorMessage = (error: unknown) => {
  const apiError = error as {
    response?: {
      data?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };
  };

  const validationErrors = apiError.response?.data?.errors;

  if (validationErrors) {
    const firstError = Object.values(validationErrors)[0]?.[0];
    if (firstError) return firstError;
  }

  return apiError.response?.data?.message || "Unable to record payment.";
};

export default function RecordPaymentModal({
  businessId,
  invoice,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const outstanding = Number(invoice.balance_due || 0);

  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("upi");
  const [paymentDate, setPaymentDate] = useState(getLocalDate());
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    if (paymentAmount > outstanding) {
      setError(
        `Payment cannot exceed the outstanding balance of ${formatCurrency(
          outstanding,
          invoice.currency,
        )}.`,
      );
      return;
    }

    if (!paymentDate) {
      setError("Please select a payment date.");
      return;
    }

    const payload: PaymentPayload = {
      amount: paymentAmount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      transaction_reference: transactionReference.trim(),
      notes: notes.trim(),
    };

    try {
      setLoading(true);

      const response: CreatePaymentResponse = await createPayment(
        businessId,
        invoice.id,
        payload,
      );

      onSuccess(response.invoice);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Record Payment
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Invoice #{invoice.invoice_number}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs font-medium text-gray-500">
                  Invoice Total
                </p>
                <p className="mt-1 text-base font-semibold text-gray-900">
                  {formatCurrency(Number(invoice.total), invoice.currency)}
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-700">
                  Outstanding
                </p>
                <p className="mt-1 text-base font-semibold text-amber-800">
                  {formatCurrency(outstanding, invoice.currency)}
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="payment-amount"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Payment Amount *
              </label>

              <div className="relative">
                <IndianRupee
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="payment-amount"
                  type="number"
                  min="0.01"
                  max={outstanding}
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter amount"
                />
              </div>

              <p className="mt-1 text-xs text-gray-500">
                Maximum payable amount:{" "}
                {formatCurrency(outstanding, invoice.currency)}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="payment-method"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Payment Method *
                </label>

                <select
                  id="payment-method"
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="payment-date"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Payment Date *
                </label>

                <div className="relative">
                  <CalendarDays
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    id="payment-date"
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="transaction-reference"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Transaction Reference
                <span className="ml-1 font-normal text-gray-400">
                  (Optional)
                </span>
              </label>

              <input
                id="transaction-reference"
                type="text"
                value={transactionReference}
                onChange={(event) =>
                  setTransactionReference(event.target.value)
                }
                maxLength={255}
                placeholder="UPI ID, transaction ID, cheque number..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="payment-notes"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Notes
                <span className="ml-1 font-normal text-gray-400">
                  (Optional)
                </span>
              </label>

              <textarea
                id="payment-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={10000}
                placeholder="Add payment notes..."
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || outstanding <= 0}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}