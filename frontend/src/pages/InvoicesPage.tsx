import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useBusiness } from "../context/BusinessContext";
import type { Customer, Invoice } from "../types";
import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  getInvoices,
  updateInvoice,
} from "../services/invoiceService";
import type {
  InvoicePagination,
  InvoicePayload,
} from "../services/invoiceService";
import { getCustomers } from "../services/customerService";
import InvoiceFormModal from "../components/invoices/InvoiceFormModal";
import InvoiceDetailsModal from "../components/invoices/InvoiceDetailsModal";

function getApiError(error: unknown): string {
  const response = (
    error as {
      response?: {
        data?: {
          message?: string;
          errors?: Record<string, string[]>;
        };
      };
    }
  ).response;

  const validationErrors = response?.data?.errors;

  if (validationErrors) {
    return Object.values(validationErrors).flat().join(" ");
  }

  return response?.data?.message || "Something went wrong. Please try again.";
}

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value: string | null) =>
  value
    ? new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-50 text-blue-700",
  partially_paid: "bg-amber-50 text-amber-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
};

export default function InvoicesPage() {
  const { activeBusiness } = useBusiness();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const businessId = activeBusiness?.id;
  const currency = activeBusiness?.currency || "INR";

  const fetchInvoices = useCallback(async () => {
    if (!businessId) return;

    setLoading(true);
    setError("");

    try {
      const result: InvoicePagination = await getInvoices(businessId, {
        search,
        status,
        page,
        perPage: 10,
      });

      setInvoices(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [businessId, search, status, page]);

  const handleInvoiceUpdated = async (updatedInvoice: Invoice) => {
    setViewingInvoice(updatedInvoice);
    await fetchInvoices();
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!businessId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await getInvoices(businessId, {
          search,
          status,
          page,
          perPage: 10,
        });

        if (!cancelled) {
          setInvoices(result.data);
          setLastPage(result.last_page);
          setTotal(result.total);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [businessId, search, status, page]);

  const loadCustomers = async () => {
    if (!businessId) return;

    setLoadingCustomers(true);

    try {
      const result = await getCustomers(businessId, "", 1, 100);
      setCustomers(result.data);
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setLoadingCustomers(false);
    }
  };

  const openCreateForm = async () => {
    setEditingInvoice(null);
    setFormError("");
    setFormOpen(true);
    await loadCustomers();
  };

  const openEditForm = async (invoice: Invoice) => {
    if (invoice.amount_paid > 0) {
      setFormError("Invoices with recorded payments cannot be edited.");
      return;
    }

    if (!businessId) return;

    setFormError("");
    setViewingInvoice(null);
    setFormOpen(true);
    setEditingInvoice(invoice);

    await loadCustomers();

    try {
      const latestInvoice = await getInvoice(businessId, invoice.id);
      setEditingInvoice(latestInvoice);
    } catch (err) {
      setFormError(getApiError(err));
    }
  };

  const openDetails = async (invoice: Invoice) => {
    if (!businessId) return;

    setError("");

    try {
      const result = await getInvoice(businessId, invoice.id);
      setViewingInvoice(result);
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const handleSave = async (payload: InvoicePayload) => {
    if (!businessId) return;

    setSaving(true);
    setFormError("");

    try {
      if (editingInvoice) {
        await updateInvoice(businessId, editingInvoice.id, payload);
      } else {
        await createInvoice(businessId, payload);
      }

      setFormOpen(false);
      setEditingInvoice(null);
      await fetchInvoices();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deletingInvoice) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteInvoice(businessId, deletingInvoice.id);
      setDeletingInvoice(null);

      if (invoices.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await fetchInvoices();
      }
    } catch (err) {
      setDeleteError(getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-600">WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Invoices
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Create, manage and track your customer invoices.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create invoice
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">All invoices</h2>
            <p className="mt-1 text-sm text-slate-500">
              {total} {total === 1 ? "invoice" : "invoices"} in this workspace
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search invoices..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="m-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          </div>
        ) : invoices.length > 0 ? (
          <>
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
                      "Balance",
                      "Status",
                      "Actions",
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
                      <td className="px-5 py-4">
                        <button
                          onClick={() => openDetails(invoice)}
                          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          {invoice.invoice_number}
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">
                          {invoice.customer_name}
                        </p>
                        {invoice.customer_email && (
                          <p className="mt-1 text-xs text-slate-400">
                            {invoice.customer_email}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(invoice.invoice_date)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {formatDate(invoice.due_date)}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                        {formatMoney(Number(invoice.total), invoice.currency)}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {formatMoney(
                          Number(invoice.balance_due),
                          invoice.currency
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusStyles[invoice.status] || statusStyles.draft
                          }`}
                        >
                          {statusLabels[invoice.status] || invoice.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            title="View invoice"
                            onClick={() => openDetails(invoice)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {invoice.amount_paid <= 0 && (
                            <button
                              title="Edit invoice"
                              onClick={() => openEditForm(invoice)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}

                          {invoice.status === "draft" && (
                            <button
                              title="Delete invoice"
                              onClick={() => {
                                setDeleteError("");
                                setDeletingInvoice(invoice);
                              }}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-500">
                Page {page} of {lastPage} · {total} total invoices
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPage((current) => Math.min(lastPage, current + 1))
                  }
                  disabled={page >= lastPage}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              {search || status !== "all" ? (
                <Search className="h-7 w-7" />
              ) : (
                <FileText className="h-7 w-7" />
              )}
            </div>

            <h3 className="mt-5 text-base font-semibold text-slate-900">
              {search || status !== "all"
                ? "No invoices found"
                : "No invoices yet"}
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {search || status !== "all"
                ? "Try changing your search or status filter."
                : "Create your first invoice to start tracking your business revenue."}
            </p>

            {!search && status === "all" && (
              <button
                onClick={openCreateForm}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Create your first invoice
              </button>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <InvoiceFormModal
          invoice={editingInvoice}
          customers={customers}
          saving={saving}
          loadingCustomers={loadingCustomers}
          error={formError}
          currency={currency}
          onClose={() => {
            if (!saving) {
              setFormOpen(false);
              setEditingInvoice(null);
              setFormError("");
            }
          }}
          onSave={handleSave}
        />
      )}

      {viewingInvoice && (
        <InvoiceDetailsModal
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onEdit={() => openEditForm(viewingInvoice)}
          onInvoiceUpdated={handleInvoiceUpdated}
        />
      )}

      {deletingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Delete invoice?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete{" "}
              <strong className="text-slate-700">
                {deletingInvoice.invoice_number}
              </strong>
              ? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-7 flex justify-end gap-3">
              <button
                onClick={() => setDeletingInvoice(null)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}