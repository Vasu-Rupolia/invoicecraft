import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import type { Customer } from "../../types";
import type { CustomerPayload } from "../../services/customerService";

type CustomerFormModalProps = {
  customer: Customer | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (payload: CustomerPayload) => Promise<void>;
};

const emptyForm: CustomerPayload = {
  name: "",
  email: "",
  phone: "",
  company_name: "",
  gstin: "",
  billing_address: "",
  shipping_address: "",
  notes: "",
};

const gstinRegex =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function CustomerFormModal({
  customer,
  saving,
  error,
  onClose,
  onSave,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<CustomerPayload>(emptyForm);
  const [gstinTouched, setGstinTouched] = useState(false);
  const [gstinServerError, setGstinServerError] = useState("");

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        company_name: customer.company_name || "",
        gstin: customer.gstin || "",
        billing_address: customer.billing_address || "",
        shipping_address: customer.shipping_address || "",
        notes: customer.notes || "",
      });
    } else {
      setForm(emptyForm);
    }

    setGstinTouched(false);
    setGstinServerError("");
  }, [customer]);

  const updateField = (field: keyof CustomerPayload, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "gstin") {
      setGstinServerError("");
    }
  };

  const gstin = form.gstin.trim().toUpperCase();

  const gstinError =
    gstin.length === 0
      ? ""
      : gstin.length !== 15
        ? "GSTIN must contain exactly 15 characters."
        : !gstinRegex.test(gstin)
          ? "Enter a valid GSTIN format."
          : "";

  const hasGstinError = Boolean(
    gstinServerError || (gstinTouched && gstinError)
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setGstinTouched(true);
    setGstinServerError("");

    if (gstinError) {
      return;
    }

    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        company_name: form.company_name.trim(),
        gstin,
      });
    } catch (err) {
      const apiError = err as {
        response?: {
          data?: {
            errors?: Record<string, string[]>;
          };
        };
      };

      const serverGstinError =
        apiError.response?.data?.errors?.gstin?.[0];

      if (serverGstinError) {
        setGstinServerError(serverGstinError);
      }
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  const labelClass = "mb-2 block text-sm font-medium text-slate-700";

  const gstinInputClass = hasGstinError
    ? "w-full rounded-xl border border-red-400 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
    : gstin.length === 15 && !gstinError
      ? "w-full rounded-xl border border-emerald-400 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
      : inputClass;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {customer ? "Edit customer" : "Add customer"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your customer's contact and business details.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && !error.toLowerCase().includes("gstin") && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Basic information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Customer name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  maxLength={255}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Company name</label>
                <input
                  maxLength={255}
                  value={form.company_name}
                  onChange={(e) =>
                    updateField("company_name", e.target.value)
                  }
                  placeholder="Company or business name"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>GSTIN</label>
                <input
                  maxLength={15}
                  value={form.gstin}
                  onBlur={() => setGstinTouched(true)}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/[^a-zA-Z0-9]/g, "")
                      .slice(0, 15)
                      .toUpperCase();

                    updateField("gstin", value);
                  }}
                  placeholder="15-character GSTIN"
                  className={gstinInputClass}
                  aria-invalid={hasGstinError}
                />

                <div className="mt-2 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5 text-xs">
                    {hasGstinError ? (
                      <>
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span className="text-red-600">
                          {gstinServerError || gstinError}
                        </span>
                      </>
                    ) : gstin.length === 15 && !gstinError ? (
                      <>
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="text-emerald-600">
                          GSTIN format looks valid.
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-500">
                        Enter a valid 15-character GSTIN. Optional field.
                      </span>
                    )}
                  </div>

                  <span className="shrink-0 text-xs text-slate-400">
                    {gstin.length}/15
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Contact information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Email address</label>
                <input
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="customer@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Phone number</label>
                <input
                  type="tel"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">
              Addresses
            </h3>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Billing address</label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.billing_address}
                  onChange={(e) =>
                    updateField("billing_address", e.target.value)
                  }
                  placeholder="Enter billing address"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Shipping address</label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={form.shipping_address}
                  onChange={(e) =>
                    updateField("shipping_address", e.target.value)
                  }
                  placeholder="Enter shipping address"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <label className={labelClass}>Notes</label>
            <textarea
              rows={3}
              maxLength={5000}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Additional information about this customer"
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || Boolean(gstinError)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {customer ? "Save changes" : "Create customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}