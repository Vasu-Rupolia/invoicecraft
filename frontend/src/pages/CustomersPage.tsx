import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useBusiness } from "../context/BusinessContext";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "../services/customerService";
import type { CustomerPayload } from "../services/customerService";
import type { Customer } from "../types";
import CustomerFormModal from "../components/customers/CustomerFormModal";

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

export default function CustomersPage() {
  const { activeBusiness } = useBusiness();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const businessId = activeBusiness?.id;

  const fetchCustomers = useCallback(async () => {
    if (!businessId) return;

    setLoading(true);
    setError("");

    try {
      const result = await getCustomers(businessId, search, page);

      setCustomers(result.data);
      setLastPage(result.last_page);
      setTotal(result.total);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, [businessId, search, page]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!businessId) return;

      setLoading(true);
      setError("");

      try {
        const result = await getCustomers(businessId, search, page);

        if (!cancelled) {
          setCustomers(result.data);
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
  }, [businessId, search, page]);

  const openCreateForm = () => {
    setEditingCustomer(null);
    setFormError("");
    setFormOpen(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormError("");
    setFormOpen(true);
  };

  const handleSave = async (payload: CustomerPayload) => {
    if (!businessId) return;

    setSaving(true);
    setFormError("");

    try {
      if (editingCustomer) {
        await updateCustomer(businessId, editingCustomer.id, payload);
      } else {
        await createCustomer(businessId, payload);
        setPage(1);
      }

      setFormOpen(false);
      setEditingCustomer(null);

      if (page === 1 || editingCustomer) {
        await fetchCustomers();
      }
    } catch (err) {
      setFormError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deletingCustomer) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteCustomer(businessId, deletingCustomer.id);

      setDeletingCustomer(null);

      if (customers.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await fetchCustomers();
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
            Customers
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Manage your customers and their business information.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add customer
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              All customers
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {total} {total === 1 ? "customer" : "customers"} in this workspace
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search customers..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
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
        ) : customers.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {["Customer", "Contact", "Company", "GSTIN", "Actions"].map(
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
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setViewingCustomer(customer)}
                          className="text-left"
                        >
                          <p className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                            {customer.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Added {new Date(customer.created_at).toLocaleDateString("en-IN")}
                          </p>
                        </button>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">
                          {customer.email || "—"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {customer.phone || "No phone"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-700">
                        {customer.company_name || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-500">
                        {customer.gstin || "—"}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            title="View customer"
                            onClick={() => setViewingCustomer(customer)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            title="Edit customer"
                            onClick={() => openEditForm(customer)}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            title="Delete customer"
                            onClick={() => {
                              setDeleteError("");
                              setDeletingCustomer(customer);
                            }}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-slate-500">
                Page {page} of {lastPage} · {total} total customers
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
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
              {search ? (
                <Search className="h-7 w-7" />
              ) : (
                <Users className="h-7 w-7" />
              )}
            </div>

            <h3 className="mt-5 text-base font-semibold text-slate-900">
              {search ? "No customers found" : "No customers yet"}
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {search
                ? "Try searching with another name, email, phone number or company."
                : "Add your first customer to start managing your business relationships."}
            </p>

            {!search && (
              <button
                onClick={openCreateForm}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Add your first customer
              </button>
            )}
          </div>
        )}
      </div>

      {formOpen && (
        <CustomerFormModal
          customer={editingCustomer}
          saving={saving}
          error={formError}
          onClose={() => {
            if (!saving) {
              setFormOpen(false);
              setFormError("");
            }
          }}
          onSave={handleSave}
        />
      )}

      {viewingCustomer && (
        <CustomerDetailsModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
          onEdit={() => {
            const customer = viewingCustomer;
            setViewingCustomer(null);
            openEditForm(customer);
          }}
        />
      )}

      {deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-900">
              Delete customer?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to delete{" "}
              <strong className="text-slate-700">
                {deletingCustomer.name}
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
                onClick={() => setDeletingCustomer(null)}
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
                Delete customer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CustomerDetailsModal({
  customer,
  onClose,
  onEdit,
}: {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
}) {
  const Detail = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: typeof Mail;
    label: string;
    value: string | null;
  }) => (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-1 whitespace-pre-line text-sm text-slate-800">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">
              {customer.name}
            </h2>
            {customer.company_name && (
              <p className="mt-1 text-sm text-slate-500">
                {customer.company_name}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <Detail icon={Mail} label="Email" value={customer.email} />
          <Detail icon={Phone} label="Phone" value={customer.phone} />
          <Detail icon={Building2} label="Company" value={customer.company_name} />
          <Detail icon={Building2} label="GSTIN" value={customer.gstin} />
          <Detail icon={MapPin} label="Billing address" value={customer.billing_address} />
          <Detail icon={MapPin} label="Shipping address" value={customer.shipping_address} />
          <div className="sm:col-span-2">
            <Detail icon={Eye} label="Notes" value={customer.notes} />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 p-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Edit2 className="h-4 w-4" />
            Edit customer
          </button>
        </div>
      </div>
    </div>
  );
}