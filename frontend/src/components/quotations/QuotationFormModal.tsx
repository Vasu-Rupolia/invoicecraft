import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import type {
  Quotation,
  QuotationPayload,
  QuotationItemPayload,
} from "../../services/quotationService";

interface Customer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  gstin?: string | null;
  billing_address?: string | null;
}

interface Props {
  open: boolean;
  quotation: Quotation | null;
  customers: Customer[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (payload: QuotationPayload) => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyItem = (): QuotationItemPayload => ({
  description: "",
  quantity: 1,
  unit: "unit",
  unit_price: 0,
  discount: 0,
  tax_rate: 0,
});

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function QuotationFormModal({
  open,
  quotation,
  customers,
  saving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [quotationDate, setQuotationDate] = useState(today());
  const [validUntil, setValidUntil] = useState("");
  const [discount, setDiscount] = useState("0");
  const [status, setStatus] = useState<"draft" | "sent">("draft");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<QuotationItemPayload[]>([
    emptyItem(),
  ]);

  useEffect(() => {
    if (!open) return;

    if (quotation) {
      setCustomerId(quotation.customer_id?.toString() ?? "");
      setCustomerName(quotation.customer_name ?? "");
      setCustomerEmail(quotation.customer_email ?? "");
      setCustomerPhone(quotation.customer_phone ?? "");
      setCustomerGstin(quotation.customer_gstin ?? "");
      setBillingAddress(quotation.billing_address ?? "");
      setQuotationDate(quotation.quotation_date?.slice(0, 10) ?? today());
      setValidUntil(quotation.valid_until?.slice(0, 10) ?? "");
      setDiscount(String(
        Math.max(
          0,
          Number(quotation.discount) -
            (quotation.items ?? []).reduce(
              (sum, item) => sum + Number(item.discount ?? 0),
              0,
            ),
        ),
      ));
      setStatus(quotation.status === "sent" ? "sent" : "draft");
      setNotes(quotation.notes ?? "");
      setTerms(quotation.terms ?? "");
      setItems(
        quotation.items?.length
          ? quotation.items.map((item) => ({
              description: item.description,
              quantity: Number(item.quantity),
              unit: item.unit || "unit",
              unit_price: Number(item.unit_price),
              discount: Number(item.discount ?? 0),
              tax_rate: Number(item.tax_rate ?? 0),
            }))
          : [emptyItem()],
      );
    } else {
      setCustomerId("");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerGstin("");
      setBillingAddress("");
      setQuotationDate(today());
      setValidUntil("");
      setDiscount("0");
      setStatus("draft");
      setNotes("");
      setTerms("");
      setItems([emptyItem()]);
    }
  }, [open, quotation]);

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum + Math.max(0, Number(item.quantity) || 0) *
          Math.max(0, Number(item.unit_price) || 0),
      0,
    );

    const itemDiscount = items.reduce(
      (sum, item) => sum + Math.max(0, Number(item.discount) || 0),
      0,
    );

    const taxable = Math.max(0, subtotal - itemDiscount);
    const invoiceDiscount = Math.max(0, Number(discount) || 0);
    const finalTaxable = Math.max(0, taxable - invoiceDiscount);

    const tax = items.reduce((sum, item) => {
      const gross = Math.max(0, Number(item.quantity) || 0) *
        Math.max(0, Number(item.unit_price) || 0);
      const base = Math.max(0, gross - Math.max(0, Number(item.discount) || 0));
      const allocated = taxable > 0
        ? invoiceDiscount * (base / taxable)
        : 0;

      return sum + Math.max(0, base - allocated) *
        (Math.max(0, Number(item.tax_rate) || 0) / 100);
    }, 0);

    return {
      subtotal,
      itemDiscount,
      discount: itemDiscount + invoiceDiscount,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((finalTaxable + tax) * 100) / 100,
    };
  }, [items, discount]);

  const updateItem = (
    index: number,
    field: keyof QuotationItemPayload,
    value: string,
  ) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "description" || field === "unit"
                  ? value
                  : Number(value),
            }
          : item,
      ),
    );
  };

  const selectCustomer = (value: string) => {
    setCustomerId(value);

    const customer = customers.find(
      (item) => item.id.toString() === value,
    );

    if (customer) {
      setCustomerName(customer.name);
      setCustomerEmail(customer.email ?? "");
      setCustomerPhone(customer.phone ?? "");
      setCustomerGstin(customer.gstin ?? "");
      setBillingAddress(customer.billing_address ?? "");
    } else {
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerGstin("");
      setBillingAddress("");
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      customer_id: customerId ? Number(customerId) : null,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: customerPhone.trim(),
      customer_gstin: customerGstin.trim().toUpperCase(),
      billing_address: billingAddress.trim(),
      quotation_date: quotationDate,
      valid_until: validUntil,
      discount: Number(discount) || 0,
      status,
      notes: notes.trim(),
      terms: terms.trim(),
      items: items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount: Number(item.discount) || 0,
        tax_rate: Number(item.tax_rate) || 0,
      })),
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-950/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {quotation ? "Edit quotation" : "Create quotation"}
              </h2>
              <p className="text-xs text-gray-500">
                Add customer, items and quotation details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="space-y-7 p-5 sm:p-7">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <section>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Customer details
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className={labelClass}>Select customer</label>
                  <select
                    className={inputClass}
                    value={customerId}
                    onChange={(e) => selectCustomer(e.target.value)}
                  >
                    <option value="">Enter customer manually</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Customer name *</label>
                  <input
                    className={inputClass}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required={!customerId}
                    disabled={!!customerId}
                    maxLength={255}
                    placeholder="Customer name"
                  />
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    disabled={!!customerId}
                    placeholder="customer@example.com"
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    className={inputClass}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={!!customerId}
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className={labelClass}>GSTIN</label>
                  <input
                    className={inputClass}
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                    disabled={!!customerId}
                    maxLength={15}
                    placeholder="15-character GSTIN"
                  />
                </div>

                <div className="md:col-span-2">
                    <label className={labelClass}>Billing address</label>
                    <textarea
                        className={inputClass}
                        rows={2}
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        placeholder="Billing address"
                    />
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Quotation details
              </h3>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Quotation date *</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Valid until</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={validUntil}
                    min={quotationDate}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    className={inputClass}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "draft" | "sent")}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Items
                </h3>
                <button
                  type="button"
                  onClick={() => setItems((current) => [...current, emptyItem()])}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  <Plus size={16} /> Add item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">
                        Item {index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={items.length === 1}
                        onClick={() =>
                          setItems((current) =>
                            current.filter((_, i) => i !== index),
                          )
                        }
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                      <div className="sm:col-span-2 lg:col-span-2">
                        <label className={labelClass}>Description *</label>
                        <input
                          className={inputClass}
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          maxLength={255}
                          required
                          placeholder="Item description"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Qty *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className={inputClass}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Unit</label>
                        <input
                          className={inputClass}
                          value={item.unit}
                          onChange={(e) => updateItem(index, "unit", e.target.value)}
                          maxLength={30}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Unit price *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClass}
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Tax %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          className={inputClass}
                          value={item.tax_rate}
                          onChange={(e) => updateItem(index, "tax_rate", e.target.value)}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Item discount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClass}
                          value={item.discount}
                          onChange={(e) => updateItem(index, "discount", e.target.value)}
                        />
                      </div>

                      <div className="flex items-end sm:col-span-2 lg:col-span-2">
                        <div className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
                          <span className="text-gray-500">Gross amount: </span>
                          <strong className="text-gray-900">
                            {money(
                              Math.max(0, item.quantity) *
                                Math.max(0, item.unit_price),
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    className={inputClass}
                    rows={3}
                    maxLength={10000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes for the customer"
                  />
                </div>
                <div>
                  <label className={labelClass}>Terms and conditions</label>
                  <textarea
                    className={inputClass}
                    rows={3}
                    maxLength={10000}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Payment terms, conditions, etc."
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3">
                  <label className={labelClass}>Additional quotation discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>

                <div className="space-y-2 border-t border-gray-200 pt-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{money(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Discount</span>
                    <span>- {money(totals.discount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{money(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
                    <span>Grand total</span>
                    <span>{money(totals.total)}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || items.some((item) => !item.description.trim())}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {quotation ? "Save changes" : "Create quotation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}