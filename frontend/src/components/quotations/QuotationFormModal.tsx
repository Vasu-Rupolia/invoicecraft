import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  X,
  Loader2,
  FileText,
} from "lucide-react";
import { useBusiness } from "../../context/BusinessContext";
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
  state?: string | null;
  state_code?: string | null;
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

const INDIAN_STATES = [
  { code: "01", name: "Jammu and Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (New)" },
  { code: "38", name: "Ladakh" },
];

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50";

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const emptyItem = (): QuotationItemPayload => ({
  description: "",
  quantity: 1,
  unit: "unit",
  unit_price: 0,
  discount: 0,
  tax_rate: 0,
});

export default function QuotationFormModal({
  open,
  quotation,
  customers,
  saving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const { activeBusiness } = useBusiness();

  const supplierStateCode = activeBusiness?.state_code ?? "";
  const supplierState = INDIAN_STATES.find(
    (state) => state.code === supplierStateCode,
  );

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState("");
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
      setPlaceOfSupplyStateCode(
        quotation.place_of_supply_state_code ?? "",
      );
      setQuotationDate(quotation.quotation_date?.slice(0, 10) ?? today());
      setValidUntil(quotation.valid_until?.slice(0, 10) ?? "");
      setDiscount(
        String(
          Math.max(
            0,
            Number(quotation.discount) -
              (quotation.items ?? []).reduce(
                (sum, item) => sum + Number(item.discount ?? 0),
                0,
              ),
          ),
        ),
      );
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
      setPlaceOfSupplyStateCode("");
      setQuotationDate(today());
      setValidUntil("");
      setDiscount("0");
      setStatus("draft");
      setNotes("");
      setTerms("");
      setItems([emptyItem()]);
    }
  }, [open, quotation]);

  const isIntraState =
    !!supplierStateCode &&
    !!placeOfSupplyStateCode &&
    supplierStateCode === placeOfSupplyStateCode;

  const isInterState =
    !!supplierStateCode &&
    !!placeOfSupplyStateCode &&
    supplierStateCode !== placeOfSupplyStateCode;

  const gstType = isIntraState
    ? "intra"
    : isInterState
      ? "inter"
      : "unknown";

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum +
        Math.max(0, Number(item.quantity) || 0) *
          Math.max(0, Number(item.unit_price) || 0),
      0,
    );

    const itemDiscount = items.reduce(
      (sum, item) => sum + Math.max(0, Number(item.discount) || 0),
      0,
    );

    const taxable = Math.max(0, subtotal - itemDiscount);
    const invoiceDiscount = Math.max(0, Number(discount) || 0);

    const rows = items.map((item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const unitPrice = Math.max(0, Number(item.unit_price) || 0);
      const gross = quantity * unitPrice;
      const itemDiscountAmount = Math.max(
        0,
        Number(item.discount) || 0,
      );
      const base = Math.max(0, gross - itemDiscountAmount);

      const allocatedDiscount =
        taxable > 0
          ? invoiceDiscount * (base / taxable)
          : 0;

      const taxableAmount = Math.max(
        0,
        base - allocatedDiscount,
      );

      const taxRate = Math.max(
        0,
        Number(item.tax_rate) || 0,
      );

      const taxAmount = roundMoney(
        taxableAmount * (taxRate / 100),
      );

      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      if (gstType === "intra") {
        cgstAmount = roundMoney(taxAmount / 2);
        sgstAmount = roundMoney(taxAmount - cgstAmount);
      } else if (gstType === "inter") {
        igstAmount = taxAmount;
      }

      return {
        gross,
        itemDiscount: itemDiscountAmount,
        allocatedDiscount,
        taxableAmount,
        taxRate,
        taxAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        lineTotal: roundMoney(taxableAmount + taxAmount),
      };
    });

    const cgst = roundMoney(
      rows.reduce((sum, row) => sum + row.cgstAmount, 0),
    );
    const sgst = roundMoney(
      rows.reduce((sum, row) => sum + row.sgstAmount, 0),
    );
    const igst = roundMoney(
      rows.reduce((sum, row) => sum + row.igstAmount, 0),
    );

    const tax = roundMoney(cgst + sgst + igst);
    const finalTaxable = roundMoney(
      Math.max(0, taxable - invoiceDiscount),
    );

    return {
      subtotal: roundMoney(subtotal),
      itemDiscount: roundMoney(itemDiscount),
      invoiceDiscount: roundMoney(invoiceDiscount),
      discount: roundMoney(itemDiscount + invoiceDiscount),
      taxable: finalTaxable,
      rows,
      cgst,
      sgst,
      igst,
      tax,
      total: roundMoney(finalTaxable + tax),
    };
  }, [items, discount, gstType]);

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
      setPlaceOfSupplyStateCode(customer.state_code ?? "");
    } else {
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerGstin("");
      setBillingAddress("");
      setPlaceOfSupplyStateCode("");
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!placeOfSupplyStateCode || !supplierStateCode) {
      return;
    }

    await onSubmit({
      customer_id: customerId ? Number(customerId) : null,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: customerPhone.trim(),
      customer_gstin: customerGstin.trim().toUpperCase(),
      billing_address: billingAddress.trim(),
      place_of_supply_state_code: placeOfSupplyStateCode,
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

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(100vh-120px)] overflow-y-auto"
        >
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
                    onChange={(e) =>
                      setCustomerGstin(e.target.value.toUpperCase())
                    }
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

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    onChange={(e) =>
                      setStatus(e.target.value as "draft" | "sent")
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    Place of Supply *
                  </label>
                  <select
                    className={inputClass}
                    value={placeOfSupplyStateCode}
                    onChange={(e) =>
                      setPlaceOfSupplyStateCode(e.target.value)
                    }
                    required
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <span>
                    Supplier state:{" "}
                    <strong className="text-gray-900">
                      {supplierState?.name ?? "Not configured"}
                    </strong>
                  </span>
                  <span>
                    Place of Supply:{" "}
                    <strong className="text-gray-900">
                      {INDIAN_STATES.find(
                        (state) => state.code === placeOfSupplyStateCode,
                      )?.name ?? "Not selected"}
                    </strong>
                  </span>
                </div>

                {gstType === "intra" && (
                  <p className="mt-2 font-medium text-emerald-700">
                    Intra-state supply: CGST + SGST will apply.
                  </p>
                )}

                {gstType === "inter" && (
                  <p className="mt-2 font-medium text-indigo-700">
                    Inter-state supply: IGST will apply.
                  </p>
                )}

                {gstType === "unknown" && (
                  <p className="mt-2 text-amber-700">
                    Configure supplier state in Business Settings and select Place of Supply to preview GST breakup.
                  </p>
                )}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Items
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) => [...current, emptyItem()])
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  <Plus size={16} /> Add item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => {
                  const row = totals.rows[index];

                  return (
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
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
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
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                            required
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Unit</label>
                          <input
                            className={inputClass}
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(index, "unit", e.target.value)
                            }
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
                            onChange={(e) =>
                              updateItem(index, "unit_price", e.target.value)
                            }
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
                            onChange={(e) =>
                              updateItem(index, "tax_rate", e.target.value)
                            }
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
                            onChange={(e) =>
                              updateItem(index, "discount", e.target.value)
                            }
                          />
                        </div>

                        <div className="flex items-end sm:col-span-2 lg:col-span-2">
                          <div className="w-full rounded-lg bg-gray-50 px-3 py-2.5 text-sm">
                            <span className="text-gray-500">
                              Gross amount:{" "}
                            </span>
                            <strong className="text-gray-900">
                              {money(row?.gross ?? 0)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 rounded-lg bg-gray-50 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <span className="text-gray-500">Taxable value</span>
                          <p className="mt-1 font-semibold text-gray-900">
                            {money(row?.taxableAmount ?? 0)}
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-500">
                            GST ({row?.taxRate ?? 0}%)
                          </span>
                          <p className="mt-1 font-semibold text-gray-900">
                            {money(row?.taxAmount ?? 0)}
                          </p>
                        </div>

                        {gstType === "intra" && (
                          <>
                            <div>
                              <span className="text-gray-500">CGST</span>
                              <p className="mt-1 font-semibold text-gray-900">
                                {money(row?.cgstAmount ?? 0)}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">SGST</span>
                              <p className="mt-1 font-semibold text-gray-900">
                                {money(row?.sgstAmount ?? 0)}
                              </p>
                            </div>
                          </>
                        )}

                        {gstType === "inter" && (
                          <div>
                            <span className="text-gray-500">IGST</span>
                            <p className="mt-1 font-semibold text-gray-900">
                              {money(row?.igstAmount ?? 0)}
                            </p>
                          </div>
                        )}

                        {gstType === "unknown" && (
                          <div>
                            <span className="text-amber-700">
                              GST breakup unavailable until states are selected.
                            </span>
                          </div>
                        )}

                        <div>
                          <span className="text-gray-500">Line total</span>
                          <p className="mt-1 font-semibold text-indigo-700">
                            {money(row?.lineTotal ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                  <label className={labelClass}>
                    Terms and conditions
                  </label>
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
                  <label className={labelClass}>
                    Additional quotation discount (₹)
                  </label>
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
                    <span>Item discount</span>
                    <span>- {money(totals.itemDiscount)}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Additional discount</span>
                    <span>- {money(totals.invoiceDiscount)}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>Taxable amount</span>
                    <span>{money(totals.taxable)}</span>
                  </div>

                  {gstType === "intra" && (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>CGST</span>
                        <span>{money(totals.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>SGST</span>
                        <span>{money(totals.sgst)}</span>
                      </div>
                    </>
                  )}

                  {gstType === "inter" && (
                    <div className="flex justify-between text-gray-600">
                      <span>IGST</span>
                      <span>{money(totals.igst)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Total GST</span>
                    <span>{money(totals.tax)}</span>
                  </div>

                  <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
                    <span>Grand total</span>
                    <span>{money(totals.total)}</span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  GST preview is calculated using the supplier state and Place of Supply. Final tax values are calculated and saved by the backend.
                </p>
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
              disabled={
                saving ||
                !placeOfSupplyStateCode ||
                !supplierStateCode ||
                items.some((item) => !item.description.trim())
              }
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