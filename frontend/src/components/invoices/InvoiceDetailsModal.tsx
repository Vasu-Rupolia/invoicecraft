import { useState } from "react";
import {
  CalendarDays,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import type { Invoice, Payment } from "../../types";
import { useBusiness } from "../../context/BusinessContext";
import api from "../../services/api";
import {
  deletePayment,
  getInvoice,
} from "../../services/invoiceService";
import InvoicePdfActions from "./InvoicePdfActions";
import RecordPaymentModal from "./RecordPaymentModal";

type InvoiceDetailsModalProps = {
  invoice: Invoice;
  onClose: () => void;
  onEdit: () => void;
  onInvoiceUpdated: (updatedInvoice: Invoice) => Promise<void>;
};

const INDIAN_STATES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const date = (value: string | null) =>
  value
    ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const getLogoUrl = (path?: string | null) => {
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.replace(/^\/+/, "");
  const storagePath = normalizedPath.startsWith("storage/")
    ? normalizedPath
    : `storage/${normalizedPath}`;

  const apiBaseUrl = api.defaults.baseURL || window.location.origin;
  const backendOrigin = new URL(
    apiBaseUrl,
    window.location.origin,
  ).origin;

  return `${backendOrigin}/${storagePath}`;
};

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-50 text-blue-700",
  partially_paid: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

export default function InvoiceDetailsModal({
  invoice,
  onClose,
  onEdit,
  onInvoiceUpdated,
}: InvoiceDetailsModalProps) {
  const { activeBusiness } = useBusiness();

  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const business = activeBusiness;
  const businessId = Number(business?.id);
  const payments = invoice.payments || [];
  const hasPayments = payments.length > 0;
  const outstanding = Number(invoice.balance_due || 0);

  const cgstAmount = Number(invoice.cgst_amount || 0);
  const sgstAmount = Number(invoice.sgst_amount || 0);
  const igstAmount = Number(invoice.igst_amount || 0);
  const totalGst = Number(invoice.tax_amount || 0);

  const placeOfSupply =
    invoice.place_of_supply_state ||
    INDIAN_STATES[invoice.place_of_supply_state_code || ""] ||
    "—";

  const taxType =
    invoice.tax_type === "igst"
      ? "Inter-state supply"
      : invoice.tax_type === "cgst_sgst"
        ? "Intra-state supply"
        : "—";

  const businessAddress = [
    business?.address,
    business?.city,
    business?.state,
    business?.postal_code,
    business?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const logoUrl = getLogoUrl(business?.logo_path);

  const handlePaymentRecorded = async (updatedInvoice: Invoice) => {
    await onInvoiceUpdated(updatedInvoice);
    setShowRecordPayment(false);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete || !businessId) return;

    try {
      setDeletingPayment(true);
      setPaymentError("");

      await deletePayment(businessId, paymentToDelete.id);

      const updatedInvoice = await getInvoice(businessId, invoice.id);
      await onInvoiceUpdated(updatedInvoice);

      setPaymentToDelete(null);
    } catch (error) {
      const apiError = error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      };

      setPaymentError(
        apiError.response?.data?.message || "Unable to delete payment.",
      );
    } finally {
      setDeletingPayment(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
        <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="h-5 w-5" />
              </div>

              <h2 className="mt-3 text-xl font-semibold text-slate-900">
                {invoice.invoice_number}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Created {date(invoice.invoice_date)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  statusStyles[invoice.status] || statusStyles.draft
                }`}
              >
                {invoice.status.replaceAll("_", " ")}
              </span>

              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-6">
            {/* Business profile */}
            <section className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start">
              <div className="flex items-start gap-4">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={`${business?.name ?? "Business"} logo`}
                    className="h-20 w-20 rounded-lg border border-slate-200 object-contain p-1"
                  />
                )}

                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {business?.name || "Business Name"}
                  </h2>

                  {businessAddress && (
                    <div className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-600">
                      <MapPin className="mt-1 h-4 w-4 shrink-0" />
                      <p>{businessAddress}</p>
                    </div>
                  )}

                  {business?.email && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4" />
                      <span>{business.email}</span>
                    </div>
                  )}

                  {business?.phone && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4" />
                      <span>{business.phone}</span>
                    </div>
                  )}

                  {business?.gstin && (
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      GSTIN: {business.gstin}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                  Business Document
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  INVOICE
                </p>
              </div>
            </section>

            {/* Customer and invoice dates */}
            <section className="grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Billed to
                </h3>

                <p className="font-semibold text-slate-900">
                  {invoice.customer_name}
                </p>

                {invoice.customer_email && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Mail className="h-4 w-4" />
                    {invoice.customer_email}
                  </p>
                )}

                {invoice.customer_phone && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <Phone className="h-4 w-4" />
                    {invoice.customer_phone}
                  </p>
                )}

                {invoice.billing_address && (
                  <p className="mt-2 flex items-start gap-2 whitespace-pre-line text-sm text-slate-500">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    {invoice.billing_address}
                  </p>
                )}

                {invoice.customer_gstin && (
                  <p className="mt-2 text-xs text-slate-500">
                    GSTIN: {invoice.customer_gstin}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarDays className="h-4 w-4 text-indigo-500" />
                  Invoice details
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-500">Invoice date</span>
                    <span className="font-medium text-slate-800">
                      {date(invoice.invoice_date)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-500">Due date</span>
                    <span className="font-medium text-slate-800">
                      {date(invoice.due_date)}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-500">Place of Supply</span>
                      <span className="text-right font-semibold text-slate-800">
                        {placeOfSupply}
                        {invoice.place_of_supply_state_code
                          ? ` (${invoice.place_of_supply_state_code})`
                          : ""}
                      </span>
                    </div>

                    <div className="mt-3 flex justify-between gap-3 text-sm">
                      <span className="text-slate-500">Supply type</span>
                      <span
                        className={`font-semibold ${
                          invoice.tax_type === "igst"
                            ? "text-orange-700"
                            : "text-indigo-700"
                        }`}
                      >
                        {taxType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Items */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Items
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        "Description",
                        "Qty",
                        "Price",
                        "Discount",
                        "GST %",
                        "CGST",
                        "SGST",
                        "IGST",
                        "Amount",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-3 py-3 text-xs font-semibold text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {invoice.items?.map((item, index) => (
                      <tr key={item.id || index}>
                        <td className="px-3 py-3 text-sm font-medium text-slate-800">
                          {item.description}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">
                          {Number(item.quantity)} {item.unit}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">
                          {money(Number(item.unit_price), invoice.currency)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">
                          {money(Number(item.discount), invoice.currency)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">
                          {Number(item.tax_rate)}%
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">
                          {money(Number(item.cgst_amount || 0), invoice.currency)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">
                          {money(Number(item.sgst_amount || 0), invoice.currency)}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-600">
                          {money(Number(item.igst_amount || 0), invoice.currency)}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-slate-800">
                          {money(Number(item.line_total), invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* GST summary and totals */}
            <section className="flex justify-end">
              <div className="w-full max-w-sm space-y-3 rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-800">
                    {money(Number(invoice.subtotal), invoice.currency)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total discount</span>
                  <span className="font-medium text-slate-800">
                    − {money(Number(invoice.discount), invoice.currency)}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    GST breakup
                  </p>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">CGST</span>
                      <span className="font-medium text-slate-800">
                        {money(cgstAmount, invoice.currency)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">SGST</span>
                      <span className="font-medium text-slate-800">
                        {money(sgstAmount, invoice.currency)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">IGST</span>
                      <span className="font-medium text-slate-800">
                        {money(igstAmount, invoice.currency)}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
                      <span className="font-semibold text-slate-700">
                        Total GST
                      </span>
                      <span className="font-semibold text-slate-900">
                        {money(totalGst, invoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="font-semibold text-slate-900">Grand Total</span>
                  <span className="text-lg font-bold text-indigo-700">
                    {money(Number(invoice.total), invoice.currency)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount paid</span>
                  <span className="font-medium text-emerald-700">
                    {money(Number(invoice.amount_paid), invoice.currency)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">
                    Balance due
                  </span>
                  <span className="font-semibold text-red-600">
                    {money(Number(invoice.balance_due), invoice.currency)}
                  </span>
                </div>
              </div>
            </section>

            {/* Notes */}
            {invoice.notes && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Notes
                </h3>
                <p className="whitespace-pre-line text-sm text-slate-600">
                  {invoice.notes}
                </p>
              </section>
            )}

            {/* Terms */}
            {invoice.terms && (
              <section>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  Terms and conditions
                </h3>
                <p className="whitespace-pre-line text-sm text-slate-600">
                  {invoice.terms}
                </p>
              </section>
            )}

            {/* Payment history */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Payment history
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {payments.length} payment{payments.length === 1 ? "" : "s"} recorded
                  </p>
                </div>

                {invoice.status !== "draft" && outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRecordPayment(true)}
                    disabled={!businessId}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Record Payment
                  </button>
                )}
              </div>

              {paymentError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {paymentError}
                </div>
              )}

              {payments.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Payment #",
                          "Date",
                          "Method",
                          "Reference",
                          "Amount",
                          "Action",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-3 py-3 text-xs font-semibold text-slate-500"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-3 py-3 text-sm font-medium text-slate-800">
                            {payment.payment_number || `#${payment.id}`}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600">
                            {date(payment.payment_date)}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600">
                            {paymentMethodLabels[payment.payment_method] ||
                              payment.payment_method}
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-600">
                            {payment.transaction_reference || "—"}
                          </td>
                          <td className="px-3 py-3 text-sm font-semibold text-emerald-700">
                            {money(Number(payment.amount), invoice.currency)}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentError("");
                                setPaymentToDelete(payment);
                              }}
                              className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 hover:text-red-700"
                              title="Delete payment"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    No payments recorded yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Payments received for this invoice will appear here.
                  </p>
                </div>
              )}

              {hasPayments && (
                <p className="text-xs text-amber-700">
                  Invoices with recorded payments cannot be edited.
                </p>
              )}
            </section>

            {/* Signature and footer */}
            <section className="flex justify-end pt-6">
              <div className="w-56 border-t border-slate-300 pt-2 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  Authorized Signature
                </p>
                {business?.name && (
                  <p className="mt-1 text-xs text-slate-500">
                    For {business.name}
                  </p>
                )}
              </div>
            </section>

            <footer className="border-t border-slate-200 pt-4 text-center">
              <p className="text-xs font-medium text-slate-600">
                {business?.name || "Thank you"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Thank you for your business.
              </p>
            </footer>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-5">
            <InvoicePdfActions invoice={invoice} business={business} />

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>

            <button
              onClick={onEdit}
              disabled={hasPayments}
              title={
                hasPayments
                  ? "Invoices with payments cannot be edited"
                  : ""
              }
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit invoice
            </button>
          </div>
        </div>
      </div>

      {showRecordPayment && businessId > 0 && (
        <RecordPaymentModal
          businessId={businessId}
          invoice={invoice}
          onClose={() => setShowRecordPayment(false)}
          onSuccess={handlePaymentRecorded}
        />
      )}

      {paymentToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete payment?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to delete payment{" "}
              <strong>
                {paymentToDelete.payment_number || `#${paymentToDelete.id}`}
              </strong>
              ? The invoice balance and status will be recalculated.
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-800">
              Amount:{" "}
              {money(Number(paymentToDelete.amount), invoice.currency)}
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                disabled={deletingPayment}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeletePayment}
                disabled={deletingPayment}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingPayment && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {deletingPayment ? "Deleting..." : "Delete Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}