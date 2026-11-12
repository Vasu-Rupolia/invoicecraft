import {
  X,
  Printer,
  FileText,
  UserRound,
  CalendarDays,
  ArrowRightLeft,
  Loader2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import type { Quotation } from "../../services/quotationService";
import { useBusiness } from "../../context/BusinessContext";
import api from "../../services/api";

interface Props {
  quotation: Quotation | null;
  onClose: () => void;
  onConvert: (quotation: Quotation) => Promise<void>;
  converting: boolean;
}

const money = (
  value: number | string | null | undefined,
  currency = "INR",
) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

const date = (value?: string | null) => {
  if (!value) return "—";

  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

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

const statusStyle: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  converted: "bg-indigo-100 text-indigo-700",
};

export default function QuotationDetailsModal({
  quotation,
  onClose,
  onConvert,
  converting,
}: Props) {
  const { activeBusiness } = useBusiness();

  if (!quotation) return null;

  const business = activeBusiness;

  const canConvert = !["converted", "rejected", "expired"].includes(
    quotation.status,
  );

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="quotation-modal fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-950/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7 print:hidden">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Quotation details
            </h2>
            <p className="text-sm text-gray-500">
              {quotation.quotation_number}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Printer size={16} />
              Print
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable quotation */}
        <div
          id="quotation-print-area"
          className="quotation-document space-y-7 p-5 sm:p-8"
        >

          {/* Business profile */}
          <section className="flex flex-col justify-between gap-5 border-b border-gray-200 pb-6 sm:flex-row sm:items-start">
            <div className="flex items-start gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={`${business?.name ?? "Business"} logo`}
                  className="h-20 w-20 rounded-lg border border-gray-200 object-contain p-1"
                />
              )}

              <div>
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  {business?.name || "Business Name"}
                </h2>

                {businessAddress && (
                  <div className="mt-2 flex items-start gap-2 text-sm leading-6 text-gray-600">
                    <MapPin size={15} className="mt-1 shrink-0" />
                    <p className="whitespace-pre-line">
                      {businessAddress}
                    </p>
                  </div>
                )}

                {business?.email && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} />
                    <span>{business.email}</span>
                  </div>
                )}

                {business?.phone && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={14} />
                    <span>{business.phone}</span>
                  </div>
                )}

                {business?.gstin && (
                  <p className="mt-2 text-sm font-semibold text-gray-700">
                    GSTIN: {business.gstin}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Business Document
              </p>
              <p className="mt-1 text-sm font-medium text-gray-500">
                QUOTATION
              </p>
            </div>
          </section>

          {/* Document heading */}
          <div className="flex flex-col justify-between gap-5 border-b-2 border-gray-800 pb-6 sm:flex-row">
            <div>
              <div className="mb-3 flex items-center gap-2 text-indigo-600">
                <FileText size={24} />
                <span className="text-sm font-bold uppercase tracking-[0.2em]">
                  Quotation
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                {quotation.quotation_number}
              </h1>

              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize print:hidden ${
                  statusStyle[quotation.status] ?? statusStyle.draft
                }`}
              >
                {quotation.status}
              </span>

              <p className="mt-2 hidden text-xs font-semibold uppercase tracking-wider text-gray-500 print:block">
                Status: {quotation.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:min-w-[260px]">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Quotation date
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {date(quotation.quotation_date)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Valid until
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {date(quotation.valid_until)}
                </p>
              </div>
            </div>
          </div>

          {/* Customer information */}
          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                <UserRound size={16} />
                Bill to
              </div>

              <p className="text-base font-bold text-gray-900">
                {quotation.customer_name}
              </p>

              {quotation.billing_address && (
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
                  {quotation.billing_address}
                </p>
              )}

              {quotation.customer_email && (
                <p className="mt-2 break-all text-sm text-gray-600">
                  {quotation.customer_email}
                </p>
              )}

              {quotation.customer_phone && (
                <p className="mt-1 text-sm text-gray-600">
                  {quotation.customer_phone}
                </p>
              )}

              {quotation.customer_gstin && (
                <p className="mt-2 text-sm font-medium text-gray-700">
                  GSTIN: {quotation.customer_gstin}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                <CalendarDays size={16} />
                Quotation validity
              </div>

              <p className="text-sm leading-6 text-gray-600">
                {quotation.valid_until
                  ? `This quotation is valid until ${date(quotation.valid_until)}.`
                  : "No validity date has been specified for this quotation."}
              </p>

              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500">Document number</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {quotation.quotation_number}
                </p>
              </div>
            </div>
          </section>

          {/* Items */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-800">
              Quotation details
            </h2>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-right">Tax</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {(quotation.items ?? []).map((item, index) => (
                    <tr key={item.id ?? index}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {item.description}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-600">
                        {Number(item.quantity)} {item.unit}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-600">
                        {money(item.unit_price, quotation.currency)}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-600">
                        {money(item.discount, quotation.currency)}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-600">
                        {Number(item.tax_rate)}%
                        <span className="block text-xs text-gray-400">
                          {money(item.tax_amount, quotation.currency)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {money(item.line_total, quotation.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Totals */}
          <section className="flex justify-end">
            <div className="w-full max-w-sm space-y-3 rounded-xl border border-gray-200 p-5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>
                  {money(quotation.subtotal, quotation.currency)}
                </span>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Discount</span>
                <span>
                  - {money(quotation.discount, quotation.currency)}
                </span>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span>
                <span>
                  {money(quotation.tax_amount, quotation.currency)}
                </span>
              </div>

              <div className="flex justify-between border-t-2 border-gray-800 pt-3 text-lg font-bold text-gray-900">
                <span>Grand Total</span>
                <span>
                  {money(quotation.total, quotation.currency)}
                </span>
              </div>
            </div>
          </section>

          {/* Notes */}
          {quotation.notes && (
            <section className="border-t border-gray-200 pt-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-800">
                Notes
              </h3>

              <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
                {quotation.notes}
              </p>
            </section>
          )}

          {/* Terms */}
          {quotation.terms && (
            <section className="border-t border-gray-200 pt-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-800">
                Terms and conditions
              </h3>

              <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
                {quotation.terms}
              </p>
            </section>
          )}

          {/* Signature */}
          <section className="flex justify-end pt-8">
            <div className="w-56 border-t border-gray-400 pt-2 text-center">
              <p className="text-sm font-semibold text-gray-800">
                Authorized Signature
              </p>
              {business?.name && (
                <p className="mt-1 text-xs text-gray-500">
                  For {business.name}
                </p>
              )}
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-gray-200 pt-4 text-center">
            <p className="text-xs font-medium text-gray-600">
              {business?.name || "Thank you"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Thank you for considering our quotation.
            </p>
          </footer>
        </div>

        {/* Modal footer */}
        <div className="flex flex-col-reverse justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4 sm:flex-row sm:items-center sm:px-7 print:hidden">
          <p className="text-xs text-gray-500">
            {quotation.status === "converted"
              ? "This quotation has already been converted."
              : "Converting creates a new draft invoice."}
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>

            {canConvert && (
              <button
                type="button"
                disabled={converting}
                onClick={() => void onConvert(quotation)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {converting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRightLeft size={16} />
                )}
                Convert to invoice
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @page {
          size: A4;
          margin: 14mm;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          .quotation-modal {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            background: transparent !important;
            padding: 0 !important;
            backdrop-filter: none !important;
          }

          .quotation-modal > div {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            overflow: visible !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          #quotation-print-area,
          #quotation-print-area * {
            visibility: visible !important;
          }

          #quotation-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #111827 !important;
            background: #ffffff !important;
          }

          #quotation-print-area table {
            width: 100% !important;
            min-width: 0 !important;
            border-collapse: collapse !important;
          }

          #quotation-print-area thead {
            display: table-header-group !important;
          }

          #quotation-print-area tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #quotation-print-area section,
          #quotation-print-area footer {
            break-inside: avoid;
          }

          #quotation-print-area .overflow-x-auto {
            overflow: visible !important;
          }

          #quotation-print-area .rounded-xl {
            border-radius: 0 !important;
          }

          #quotation-print-area .bg-gray-100 {
            background: #f3f4f6 !important;
          }

          #quotation-print-area .text-gray-400,
          #quotation-print-area .text-gray-500,
          #quotation-print-area .text-gray-600 {
            color: #4b5563 !important;
          }

          #quotation-print-area .text-gray-900 {
            color: #111827 !important;
          }

          button,
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}