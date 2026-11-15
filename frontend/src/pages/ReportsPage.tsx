
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  IndianRupee,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { useBusiness } from "../context/BusinessContext";
import {
  getReports,
  type ReportsData,
  type OutstandingInvoice,
} from "../services/reportsService";

const today = new Date();
const defaultFromDate = `${today.getFullYear()}-01-01`;
const defaultToDate = today.toISOString().slice(0, 10);

const formatCurrency = (amount: number, currency = "INR") => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `₹${(amount || 0).toFixed(2)}`;
  }
};

const formatDate = (date: string | null) => {
  if (!date) return "—";

  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
};

const formatLabel = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getStatusClasses = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "overdue":
      return "bg-red-50 text-red-700";
    case "partially_paid":
      return "bg-amber-50 text-amber-700";
    case "sent":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export default function ReportsPage() {
  const { activeBusiness } = useBusiness();

  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [appliedFromDate, setAppliedFromDate] = useState(defaultFromDate);
  const [appliedToDate, setAppliedToDate] = useState(defaultToDate);

  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const businessId = activeBusiness?.id;
  const currency = activeBusiness?.currency || "INR";

  const refreshReports = useCallback(async () => {
    if (!businessId) {
      setReports(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getReports(businessId, {
        from_date: appliedFromDate,
        to_date: appliedToDate,
      });

      setReports(data);
    } catch (err: unknown) {
      const message = (
        err as { response?: { data?: { message?: string } } }
      ).response?.data?.message;

      setError(message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }, [businessId, appliedFromDate, appliedToDate]);

  useEffect(() => {
    refreshReports();
  }, [refreshReports]);

  const applyFilters = () => {
    if (!fromDate || !toDate) {
      setError("Please select both dates.");
      return;
    }

    if (fromDate > toDate) {
      setError("From date cannot be later than To date.");
      return;
    }

    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const summary = reports?.summary;

  const metricCards = [
    {
      label: "Invoiced amount",
      value: formatCurrency(summary?.invoiced_amount || 0, currency),
      detail: `${summary?.invoice_count || 0} invoices in selected period`,
      icon: FileText,
      iconStyle: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Received amount",
      value: formatCurrency(summary?.received_amount || 0, currency),
      detail: `${summary?.payment_count || 0} payments received`,
      icon: Wallet,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Outstanding",
      value: formatCurrency(summary?.outstanding_amount || 0, currency),
      detail: "Balance due on selected invoices",
      icon: Clock,
      iconStyle: "bg-amber-50 text-amber-600",
    },
    {
      label: "Overdue amount",
      value: formatCurrency(summary?.overdue_amount || 0, currency),
      detail: `${summary?.overdue_count || 0} overdue invoices`,
      icon: AlertCircle,
      iconStyle: "bg-red-50 text-red-600",
    },
  ];

  const exportOutstandingCsv = () => {
    const invoices = reports?.outstanding_invoices || [];

    if (!invoices.length) return;

    const headers = [
      "Invoice Number",
      "Customer",
      "Invoice Date",
      "Due Date",
      "Invoice Amount",
      "Amount Paid",
      "Balance Due",
      "Status",
    ];

    const escapeCsv = (value: string | number) => {
      let text = String(value ?? "");

      // Prevent spreadsheet formula execution.
      if (/^[=+\-@]/.test(text)) {
        text = `'${text}`;
      }

      return `"${text.replace(/"/g, '""')}"`;
    };

    const rows = invoices.map((invoice) => [
      invoice.invoice_number,
      invoice.customer_name || "",
      invoice.invoice_date || "",
      invoice.due_date || "",
      invoice.total,
      invoice.amount_paid,
      invoice.balance_due,
      invoice.is_overdue ? "Overdue" : formatLabel(invoice.status),
    ]);

    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `outstanding-invoices-${appliedFromDate}-to-${appliedToDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">BUSINESS INSIGHTS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Reports
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Track revenue, payments and outstanding invoices.
          </p>
        </div>

        <button
          onClick={refreshReports}
          disabled={loading || !businessId}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Date filters */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-slate-600">
              From date
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-slate-600">
              To date
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                max={defaultToDate}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <button
            onClick={applyFilters}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <BarChart3 className="h-4 w-4" />
            Apply filters
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load reports</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {item.label}
                </p>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconStyle}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              {loading ? (
                <div className="mt-5 h-8 w-36 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <p className="mt-5 break-words text-2xl font-semibold tracking-tight text-slate-900">
                  {item.value}
                </p>
              )}

              <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <MonthlyRevenueChart
          data={reports?.monthly_revenue || []}
          loading={loading}
          currency={currency}
        />

        <PaymentMethodBreakdown
          data={reports?.payment_methods || []}
          loading={loading}
          currency={currency}
        />
      </div>

      {/* Outstanding invoices */}
      <OutstandingInvoices
        invoices={reports?.outstanding_invoices || []}
        loading={loading}
        currency={currency}
        onExport={exportOutstandingCsv}
      />

      <div className="mt-8 flex flex-col justify-between gap-2 text-xs text-slate-400 sm:flex-row">
        <p>
          Showing reports for{" "}
          <span className="font-semibold text-slate-600">
            {activeBusiness?.name}
          </span>
        </p>
        <p>
          Period: {formatDate(appliedFromDate)} – {formatDate(appliedToDate)}
        </p>
      </div>
    </>
  );
}

function MonthlyRevenueChart({
  data,
  loading,
  currency,
}: {
  data: ReportsData["monthly_revenue"];
  loading: boolean;
  currency: string;
}) {
  const maxRevenue = Math.max(...data.map((item) => item.revenue), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Monthly revenue
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Invoice value by month
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      {loading ? (
        <div className="mt-8 h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : data.length > 0 ? (
        <div className="mt-8 flex h-52 items-end gap-2 overflow-x-auto pb-1 sm:gap-3">
          {data.map((item) => {
            const height =
              maxRevenue > 0
                ? Math.max((item.revenue / maxRevenue) * 100, 3)
                : 3;

            return (
              <div
                key={item.month}
                className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                title={`${item.label}: ${formatCurrency(item.revenue, currency)}`}
              >
                <span className="mb-2 hidden whitespace-nowrap text-[10px] font-medium text-slate-500 group-hover:block sm:text-xs">
                  {formatCurrency(item.revenue, currency)}
                </span>
                <div className="flex h-40 w-full items-end justify-center">
                  <div
                    className="w-full max-w-12 rounded-t-lg bg-indigo-500 transition-all duration-300 group-hover:bg-indigo-700"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="mt-3 whitespace-nowrap text-[10px] font-medium text-slate-500 sm:text-xs">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyChart message="No invoice revenue found for this period." />
      )}
    </div>
  );
}

function PaymentMethodBreakdown({
  data,
  loading,
  currency,
}: {
  data: ReportsData["payment_methods"];
  loading: boolean;
  currency: string;
}) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  const colors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-rose-500",
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Payment methods
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Collection split by payment method
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <IndianRupee className="h-5 w-5" />
        </div>
      </div>

      {loading ? (
        <div className="mt-8 space-y-5">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-10 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      ) : data.length > 0 ? (
        <div className="mt-8 space-y-5">
          <div>
            <p className="text-xs font-medium text-slate-400">
              TOTAL COLLECTION
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {formatCurrency(total, currency)}
            </p>
          </div>

          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {data.map((item, index) => (
              <div
                key={item.payment_method}
                className={`${colors[index % colors.length]} transition-all`}
                style={{
                  width: `${total > 0 ? (item.amount / total) * 100 : 0}%`,
                }}
                title={`${formatLabel(item.payment_method)}: ${formatCurrency(item.amount, currency)}`}
              />
            ))}
          </div>

          <div className="space-y-4">
            {data.map((item, index) => {
              const percentage =
                total > 0 ? (item.amount / total) * 100 : 0;

              return (
                <div
                  key={item.payment_method}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`h-3 w-3 shrink-0 rounded-full ${colors[index % colors.length]}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {formatLabel(item.payment_method)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.payment_count}{" "}
                        {item.payment_count === 1 ? "payment" : "payments"} ·{" "}
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatCurrency(item.amount, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyChart message="No payments found for this period." />
      )}
    </div>
  );
}

function OutstandingInvoices({
  invoices,
  loading,
  currency,
  onExport,
}: {
  invoices: OutstandingInvoice[];
  loading: boolean;
  currency: string;
  onExport: () => void;
}) {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Outstanding invoices
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Invoices with pending balances in the selected period.
          </p>
        </div>

        <button
          onClick={onExport}
          disabled={loading || invoices.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 p-6">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-12 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      ) : invoices.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {[
                  "Invoice",
                  "Customer",
                  "Invoice date",
                  "Due date",
                  "Total",
                  "Paid",
                  "Balance due",
                  "Status",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {invoice.customer_name || "—"}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {formatDate(invoice.invoice_date)}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">
                    {formatDate(invoice.due_date)}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">
                    {formatCurrency(invoice.total, currency)}
                  </td>
                  <td className="px-5 py-4 text-sm text-emerald-700">
                    {formatCurrency(invoice.amount_paid, currency)}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                    {formatCurrency(invoice.balance_due, currency)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${invoice.is_overdue ? "bg-red-50 text-red-700" : getStatusClasses(invoice.status)}`}
                    >
                      {invoice.is_overdue
                        ? "Overdue"
                        : formatLabel(invoice.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-base font-semibold text-slate-900">
            No outstanding invoices
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            There are no invoices with pending balances in this date range.
          </p>
        </div>
      )}

      {!loading && invoices.length === 100 && (
        <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
          Showing the latest 100 outstanding invoices returned by the report.
        </p>
      )}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <BarChart3 className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm text-slate-500">{message}</p>
    </div>
  );
}