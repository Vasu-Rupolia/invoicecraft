import {
  CalendarDays,
  FileText,
  Mail,
  MapPin,
  Phone,
  X,
} from "lucide-react";
import type { Invoice } from "../../types";
import { useBusiness } from "../../context/BusinessContext";
import api from "../../services/api";
import InvoicePdfActions from "./InvoicePdfActions";

type InvoiceDetailsModalProps = {
  invoice: Invoice;
  onClose: () => void;
  onEdit: () => void;
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

export default function InvoiceDetailsModal({
  invoice,
  onClose,
  onEdit,
}: InvoiceDetailsModalProps) {
  const { activeBusiness } = useBusiness();

  const hasPayments = Boolean(invoice.payments?.length);
  const business = activeBusiness;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* Modal header */}
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
                Invoice dates
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
              </div>
            </div>
          </section>

          {/* Items */}
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Items
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[620px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {["Description", "Qty", "Price", "Discount", "GST", "Amount"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-3 py-3 text-xs font-semibold text-slate-500"
                        >
                          {heading}
                        </th>
                      )
                    )}
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
                      <td className="px-3 py-3 text-sm font-semibold text-slate-800">
                        {money(Number(item.line_total), invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals */}
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

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">GST</span>
                <span className="font-medium text-slate-800">
                  {money(Number(invoice.tax_amount), invoice.currency)}
                </span>
              </div>

              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-900">Total</span>
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
                <span className="font-semibold text-slate-700">Balance due</span>
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
          {hasPayments && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Payment history
              </p>
              <p className="mt-1 text-sm text-amber-700">
                This invoice has recorded payments and cannot currently be edited.
              </p>
            </section>
          )}

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

        {/* Modal footer */}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-5">
            <InvoicePdfActions
                invoice={invoice}
                business={business}
            />

            <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
                Close
            </button>

            <button
                onClick={onEdit}
                disabled={hasPayments}
                title={hasPayments ? "Invoices with payments cannot be edited" : ""}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
                Edit invoice
            </button>
        </div>
      </div>
    </div>
  );
}