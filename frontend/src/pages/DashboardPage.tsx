import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useBusiness } from "../context/BusinessContext";
import type { DashboardData, RecentInvoice } from "../types";

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

const getStatusClasses = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "overdue":
      return "bg-red-50 text-red-700";
    case "partial":
    case "partially_paid":
      return "bg-amber-50 text-amber-700";
    case "sent":
    case "pending":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeBusiness } = useBusiness();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshDashboard = useCallback(async () => {
    if (!activeBusiness) return;

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/businesses/${activeBusiness.id}/dashboard`
      );

      setDashboard(response.data);
    } catch (err: unknown) {
      const message = (
        err as { response?: { data?: { message?: string } } }
      ).response?.data?.message;

      setError(message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [activeBusiness]);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const metrics = dashboard?.metrics;

  const metricCards = [
    {
      label: "Total revenue",
      value: formatCurrency(
        metrics?.total_revenue || 0,
        activeBusiness?.currency
      ),
      detail: "Total payments received",
      icon: Wallet,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "This month",
      value: formatCurrency(
        metrics?.monthly_revenue || 0,
        activeBusiness?.currency
      ),
      detail: "Payments received this month",
      icon: TrendingUp,
      iconStyle: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Outstanding",
      value: formatCurrency(
        metrics?.outstanding_amount || 0,
        activeBusiness?.currency
      ),
      detail: "Pending customer payments",
      icon: Clock,
      iconStyle: "bg-amber-50 text-amber-600",
    },
    {
      label: "Total invoices",
      value: String(metrics?.total_invoices || 0),
      detail: "Invoices created",
      icon: FileText,
      iconStyle: "bg-blue-50 text-blue-600",
    },
    {
      label: "Customers",
      value: String(metrics?.total_customers || 0),
      detail: "Your customer base",
      icon: Users,
      iconStyle: "bg-violet-50 text-violet-600",
    },
    {
      label: "Pending invoices",
      value: String(metrics?.pending_invoices || 0),
      detail: "Awaiting payment",
      icon: ReceiptText,
      iconStyle: "bg-orange-50 text-orange-600",
    },
    {
      label: "Paid invoices",
      value: String(metrics?.paid_invoices || 0),
      detail: "Fully paid invoices",
      icon: CheckCircle2,
      iconStyle: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Overdue invoices",
      value: String(metrics?.overdue_invoices || 0),
      detail: "Past their due date",
      icon: AlertCircle,
      iconStyle: "bg-red-50 text-red-600",
    },
  ];

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">OVERVIEW</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Good to see you, {user?.name.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Here's what's happening with your business today.
          </p>
        </div>

        <button
          onClick={refreshDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to load dashboard</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
                <div className="mt-5 h-8 w-32 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
                  {item.value}
                </p>
              )}

              <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
            </div>
          );
        })}
      </div>

      <RecentInvoices
        invoices={dashboard?.recent_invoices || []}
        loading={loading}
        currency={activeBusiness?.currency || "INR"}
      />

      <div className="mt-8 flex flex-col justify-between gap-2 text-xs text-slate-400 sm:flex-row">
        <p>
          Showing data for{" "}
          <span className="font-semibold text-slate-600">
            {activeBusiness?.name}
          </span>
        </p>
        <p>InvoiceCraft Workspace</p>
      </div>
    </>
  );
}

function RecentInvoices({
  invoices,
  loading,
  currency,
}: {
  invoices: RecentInvoice[];
  loading: boolean;
  currency: string;
}) {
  return (
    <div className="mt-9 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Recent invoices
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your latest invoice activity.
          </p>
        </div>
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
          <table className="w-full min-w-[700px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {["Invoice", "Customer", "Date", "Amount", "Status"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="transition hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {invoice.customer_name || "—"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      {formatDate(invoice.invoice_date)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {formatCurrency(Number(invoice.total), invoice.currency || currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(invoice.status)}`}
                    >
                      {invoice.status.replaceAll("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FileText className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-base font-semibold text-slate-900">
            No invoices yet
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Your recent invoices will appear here once you start creating
            invoices for your customers.
          </p>
        </div>
      )}
    </div>
  );
}