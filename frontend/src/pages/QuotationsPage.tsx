import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit2,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useBusiness } from "../context/BusinessContext";
import api from "../services/api";
import {
  convertQuotationToInvoice,
  createQuotation,
  deleteQuotation,
  getQuotation,
  getQuotations,
  updateQuotation,
} from "../services/quotationService";
import type {
  Quotation,
  QuotationPayload,
  QuotationStatus,
} from "../services/quotationService";
import QuotationFormModal from "../components/quotations/QuotationFormModal";
import QuotationDetailsModal from "../components/quotations/QuotationDetailsModal";

interface Customer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  billing_address?: string | null;
}

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

function money(value: number | string, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

const statusClasses: Record<QuotationStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-50 text-blue-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-amber-50 text-amber-700",
  converted: "bg-indigo-50 text-indigo-700",
};

const statusLabels: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  converted: "Converted",
};

export default function QuotationsPage() {
  const { activeBusiness } = useBusiness();
  const businessId = activeBusiness?.id;

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(
    null,
  );
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(
    null,
  );
  const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(
    null,
  );

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchQuotations = useCallback(async () => {
    if (!businessId) {
      setQuotations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getQuotations(businessId, {
        search: search.trim() || undefined,
        status: status || undefined,
        page,
        per_page: 10,
      });

      setQuotations(result.data ?? []);
      setLastPage(result.last_page ?? 1);
      setTotal(result.total ?? 0);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [businessId, search, status, page]);

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
        const result = await getQuotations(businessId, {
          search: search.trim() || undefined,
          status: status || undefined,
          page,
          per_page: 10,
        });

        if (!cancelled) {
          setQuotations(result.data ?? []);
          setLastPage(result.last_page ?? 1);
          setTotal(result.total ?? 0);
        }
      } catch (err) {
        if (!cancelled) setError(getApiError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [businessId, search, status, page]);

  useEffect(() => {
    let cancelled = false;

    const loadCustomers = async () => {
      if (!businessId) return;

      try {
        const response = await api.get(
          `/businesses/${businessId}/customers`,
          { params: { per_page: 100 } },
        );

        const payload = response.data.customers ?? response.data;
        const list = Array.isArray(payload) ? payload : payload.data ?? [];

        if (!cancelled) setCustomers(list);
      } catch {
        if (!cancelled) setCustomers([]);
      }
    };

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const openCreateForm = () => {
    setEditingQuotation(null);
    setFormError("");
    setFormOpen(true);
  };

  const openEditForm = async (quotation: Quotation) => {
    if (!businessId) return;

    setFormError("");

    try {
      const fullQuotation = await getQuotation(businessId, quotation.id);

      if (fullQuotation.status === "converted") {
        setError("A converted quotation cannot be edited.");
        return;
      }

      setEditingQuotation(fullQuotation);
      setFormOpen(true);
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const openDetails = async (quotation: Quotation) => {
    if (!businessId) return;

    try {
      const fullQuotation = await getQuotation(businessId, quotation.id);
      setViewingQuotation(fullQuotation);
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const handleSave = async (payload: QuotationPayload) => {
    if (!businessId) return;

    setSaving(true);
    setFormError("");
    setSuccess("");

    try {
      if (editingQuotation) {
        await updateQuotation(businessId, editingQuotation.id, payload);
        setSuccess("Quotation updated successfully.");
      } else {
        await createQuotation(businessId, payload);
        setSuccess("Quotation created successfully.");
      }

      setFormOpen(false);
      setEditingQuotation(null);
      await fetchQuotations();
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deletingQuotation) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteQuotation(businessId, deletingQuotation.id);

      setDeletingQuotation(null);
      setSuccess("Quotation deleted successfully.");

      if (quotations.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await fetchQuotations();
      }
    } catch (err) {
      setDeleteError(getApiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleConvert = async (quotation: Quotation) => {
    if (!businessId) return;

    const confirmed = window.confirm(
      `Convert ${quotation.quotation_number} into a new draft invoice?`,
    );

    if (!confirmed) return;

    setConverting(true);
    setError("");

    try {
      const invoice = await convertQuotationToInvoice(
        businessId,
        quotation.id,
      );

      setViewingQuotation(null);
      setSuccess(
        `Quotation converted successfully. Invoice ${invoice.invoice_number} has been created.`,
      );

      await fetchQuotations();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setConverting(false);
    }
  };

//   const canEdit = (quotation: Quotation) =>
//     quotation.status !== "converted";

  const canDelete = (quotation: Quotation) =>
    quotation.status !== "converted";
  const canEdit = (quotation: Quotation) =>
  quotation.status === "draft" || quotation.status === "sent";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Quotations
              </h1>
              <p className="mt-0.5 text-sm text-gray-500">
                Create and manage customer quotations
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus size={18} />
          Create quotation
        </button>
      </div>

      {success && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="shrink-0 rounded p-0.5 hover:bg-emerald-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-start gap-2">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            {error}
          </span>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 rounded p-0.5 hover:bg-red-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText size={17} />
            Total quotations
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{total}</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock3 size={17} />
            Current page
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {page} <span className="text-base font-medium text-gray-400">/ {lastPage}</span>
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <UserRound size={17} />
            Customers available
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {customers.length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search quotation number or customer..."
              className="min-h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-xl border border-gray-200 bg-white px-3.5 text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 sm:w-48"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
            <option value="converted">Converted</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 size={28} className="animate-spin text-indigo-600" />
            <p className="text-sm">Loading quotations...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-400">
              <FileText size={26} />
            </div>
            <h3 className="mt-4 font-semibold text-gray-900">
              No quotations found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              {search || status
                ? "Try changing your search or status filter."
                : "Create your first quotation to get started."}
            </p>
            {!search && !status && (
              <button
                type="button"
                onClick={openCreateForm}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                <Plus size={16} /> Create quotation
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Quotation</th>
                    <th className="px-5 py-3.5 font-semibold">Customer</th>
                    <th className="px-5 py-3.5 font-semibold">Date</th>
                    <th className="px-5 py-3.5 font-semibold">Valid until</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {quotations.map((quotation) => (
                    <tr
                      key={quotation.id}
                      className="transition hover:bg-gray-50/70"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => void openDetails(quotation)}
                          className="font-semibold text-indigo-700 hover:text-indigo-900"
                        >
                          {quotation.quotation_number}
                        </button>
                        <p className="mt-1 text-xs text-gray-400">
                          {quotation.items?.length ?? 0} items
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-800">
                          {quotation.customer_name}
                        </p>
                        {quotation.customer_email && (
                          <p className="mt-1 max-w-48 truncate text-xs text-gray-400">
                            {quotation.customer_email}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={14} className="text-gray-400" />
                          {formatDate(quotation.quotation_date)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(quotation.valid_until)}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-gray-900">
                        {money(quotation.total, quotation.currency)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusClasses[quotation.status] ??
                            statusClasses.draft
                          }`}
                        >
                          {statusLabels[quotation.status] ?? quotation.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="View quotation"
                            onClick={() => void openDetails(quotation)}
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            <Eye size={17} />
                          </button>

                          {canEdit(quotation) && (
                            <button
                              type="button"
                              title="Edit quotation"
                              onClick={() => void openEditForm(quotation)}
                              className="rounded-lg p-2 text-gray-500 transition hover:bg-amber-50 hover:text-amber-700"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}

                          {canDelete(quotation) && (
                            <button
                              type="button"
                              title="Delete quotation"
                              onClick={() => {
                                setDeleteError("");
                                setDeletingQuotation(quotation);
                              }}
                              className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={17} />
                            </button>
                          )}

                          {quotation.status !== "converted" &&
                            quotation.status !== "rejected" &&
                            quotation.status !== "expired" && (
                              <button
                                type="button"
                                title="Convert to invoice"
                                onClick={() => void handleConvert(quotation)}
                                className="rounded-lg p-2 text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-700"
                              >
                                <ArrowRightLeft size={17} />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-gray-500">
                Showing {quotations.length} of {total} quotations
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="min-w-20 text-center text-sm font-medium text-gray-700">
                  Page {page} of {lastPage}
                </span>

                <button
                  type="button"
                  disabled={page >= lastPage}
                  onClick={() =>
                    setPage((current) => Math.min(lastPage, current + 1))
                  }
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <QuotationFormModal
        open={formOpen}
        quotation={editingQuotation}
        customers={customers}
        saving={saving}
        error={formError}
        onClose={() => {
          if (saving) return;
          setFormOpen(false);
          setEditingQuotation(null);
          setFormError("");
        }}
        onSubmit={handleSave}
      />

      <QuotationDetailsModal
        quotation={viewingQuotation}
        onClose={() => setViewingQuotation(null)}
        onConvert={handleConvert}
        converting={converting}
      />

      {deletingQuotation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="grid size-12 place-items-center rounded-xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Delete quotation?
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Are you sure you want to delete{" "}
              <strong className="text-gray-800">
                {deletingQuotation.quotation_number}
              </strong>
              ? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingQuotation(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && <Loader2 size={16} className="animate-spin" />}
                Delete quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}