import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Customer, Invoice } from "../../types";
import type { InvoicePayload } from "../../services/invoiceService";
import { useBusiness } from "../../context/BusinessContext";

type InvoiceFormModalProps = {
  invoice: Invoice | null;
  customers: Customer[];
  saving: boolean;
  loadingCustomers: boolean;
  error: string;
  currency: string;
  onClose: () => void;
  onSave: (payload: InvoicePayload) => Promise<void>;
};

type FormItem = {
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  discount: string;
  tax_rate: string;
};

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

const today = () => {
  const date = new Date();
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
};

const emptyItem = (): FormItem => ({
  description: "",
  quantity: "1",
  unit: "unit",
  unit_price: "0",
  discount: "0",
  tax_rate: "18",
});

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(value);

export default function InvoiceFormModal({
  invoice,
  customers,
  saving,
  loadingCustomers,
  error,
  currency,
  onClose,
  onSave,
}: InvoiceFormModalProps) {
  const { activeBusiness } = useBusiness();

  const supplierStateCode = activeBusiness?.state_code || "";

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState("");

  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [invoiceDiscount, setInvoiceDiscount] = useState("0");
  const [status, setStatus] = useState<"draft" | "sent">("draft");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<FormItem[]>([emptyItem()]);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (invoice) {
      setCustomerId(invoice.customer_id?.toString() || "");
      setCustomerName(invoice.customer_name || "");
      setCustomerEmail(invoice.customer_email || "");
      setCustomerPhone(invoice.customer_phone || "");
      setCustomerGstin(invoice.customer_gstin || "");
      setBillingAddress(invoice.billing_address || "");
      setPlaceOfSupplyStateCode(
        invoice.place_of_supply_state_code || ""
      );
      setInvoiceDate(invoice.invoice_date?.slice(0, 10) || today());
      setDueDate(invoice.due_date?.slice(0, 10) || "");
      setInvoiceDiscount(
        String(
          Math.max(
            0,
            Number(invoice.discount) -
              (invoice.items || []).reduce(
                (sum, item) => sum + Number(item.discount || 0),
                0
              )
          )
        )
      );
      setStatus(invoice.status === "draft" ? "draft" : "sent");
      setNotes(invoice.notes || "");
      setTerms(invoice.terms || "");
      setItems(
        invoice.items?.length
          ? invoice.items.map((item) => ({
              description: item.description,
              quantity: String(item.quantity),
              unit: item.unit || "unit",
              unit_price: String(item.unit_price),
              discount: String(item.discount || 0),
              tax_rate: String(item.tax_rate || 0),
            }))
          : [emptyItem()]
      );
    } else {
      setCustomerId("");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerGstin("");
      setBillingAddress("");
      setPlaceOfSupplyStateCode("");
      setInvoiceDate(today());
      setDueDate("");
      setInvoiceDiscount("0");
      setStatus("draft");
      setNotes("");
      setTerms("");
      setItems([emptyItem()]);
    }

    setLocalError("");
  }, [invoice]);

  const selectedCustomer = customers.find(
    (customer) => String(customer.id) === customerId
  );

  const selectedSupplierState = INDIAN_STATES.find(
    (state) => state.code === supplierStateCode
  );

  const selectedPlaceOfSupplyState = INDIAN_STATES.find(
    (state) => state.code === placeOfSupplyStateCode
  );

  const isGstConfigured = Boolean(
    supplierStateCode &&
      placeOfSupplyStateCode &&
      selectedSupplierState &&
      selectedPlaceOfSupplyState
  );

  const isIntraState =
    isGstConfigured &&
    supplierStateCode === placeOfSupplyStateCode;

  const taxType = isGstConfigured
    ? isIntraState
      ? "cgst_sgst"
      : "igst"
    : null;

  const handleCustomerChange = (value: string) => {
    setCustomerId(value);

    const selected = customers.find(
      (customer) => String(customer.id) === value
    );

    if (selected) {
      setCustomerName(selected.name || "");
      setCustomerEmail(selected.email || "");
      setCustomerPhone(selected.phone || "");
      setCustomerGstin(selected.gstin || "");
      setBillingAddress(selected.billing_address || "");
      setPlaceOfSupplyStateCode(selected.state_code || "");
    } else {
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setCustomerGstin("");
      setBillingAddress("");
      setPlaceOfSupplyStateCode("");
    }
  };

  const updateItem = (
    index: number,
    field: keyof FormItem,
    value: string
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const calculations = useMemo(() => {
    const calculatedItems = items.map((item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const price = Math.max(0, Number(item.unit_price) || 0);
      const discount = Math.max(0, Number(item.discount) || 0);
      const taxRate = Math.max(0, Number(item.tax_rate) || 0);

      const gross = quantity * price;
      const itemDiscount = Math.min(discount, gross);
      const taxable = Math.max(0, gross - itemDiscount);

      return {
        gross,
        itemDiscount,
        taxable,
        taxRate,
      };
    });

    const subtotal = calculatedItems.reduce(
      (sum, item) => sum + item.gross,
      0
    );

    const itemDiscounts = calculatedItems.reduce(
      (sum, item) => sum + item.itemDiscount,
      0
    );

    const taxableSubtotal = Math.max(0, subtotal - itemDiscounts);

    const discount = Math.min(
      Math.max(0, Number(invoiceDiscount) || 0),
      taxableSubtotal
    );

    let distributedDiscount = 0;

    const itemsWithGst = calculatedItems.map((item, index) => {
      const allocated =
        index === calculatedItems.length - 1
          ? discount - distributedDiscount
          : taxableSubtotal > 0
            ? discount * (item.taxable / taxableSubtotal)
            : 0;

      if (index !== calculatedItems.length - 1) {
        distributedDiscount += allocated;
      }

      const taxableAfterDiscount = Math.max(
        0,
        item.taxable - allocated
      );

      const gstAmount = roundMoney(
        taxableAfterDiscount * (item.taxRate / 100)
      );

      let cgstAmount = 0;
      let sgstAmount = 0;
      let igstAmount = 0;

      if (taxType === "cgst_sgst") {
        cgstAmount = roundMoney(gstAmount / 2);
        sgstAmount = roundMoney(gstAmount - cgstAmount);
      } else if (taxType === "igst") {
        igstAmount = gstAmount;
      }

      return {
        ...item,
        allocatedInvoiceDiscount: allocated,
        taxableAfterDiscount,
        gstAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        lineTotal: taxableAfterDiscount + gstAmount,
      };
    });

    const cgstAmount = roundMoney(
      itemsWithGst.reduce((sum, item) => sum + item.cgstAmount, 0)
    );

    const sgstAmount = roundMoney(
      itemsWithGst.reduce((sum, item) => sum + item.sgstAmount, 0)
    );

    const igstAmount = roundMoney(
      itemsWithGst.reduce((sum, item) => sum + item.igstAmount, 0)
    );

    const taxAmount = roundMoney(
      itemsWithGst.reduce((sum, item) => sum + item.gstAmount, 0)
    );

    const total = roundMoney(
      taxableSubtotal - discount + taxAmount
    );

    return {
      items: itemsWithGst,
      subtotal,
      itemDiscounts,
      discount,
      taxableSubtotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      taxAmount,
      total,
    };
  }, [items, invoiceDiscount, taxType]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (customerId && !selectedCustomer) {
      setLocalError("Please select a valid customer.");
      return;
    }

    if (!customerId && !customerName.trim()) {
      setLocalError("Please select a customer or enter a customer name.");
      return;
    }

    if (!placeOfSupplyStateCode) {
      setLocalError("Please select the Place of Supply state.");
      return;
    }

    if (
      !INDIAN_STATES.some(
        (state) => state.code === placeOfSupplyStateCode
      )
    ) {
      setLocalError("Please select a valid Place of Supply state.");
      return;
    }

    if (!supplierStateCode || !selectedSupplierState) {
      setLocalError(
        "Please configure your business state in Business Settings before creating an invoice."
      );
      return;
    }

    if (dueDate && dueDate < invoiceDate) {
      setLocalError("Due date cannot be earlier than invoice date.");
      return;
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const quantity = Number(item.quantity);
      const price = Number(item.unit_price);
      const discount = Number(item.discount);
      const gross = quantity * price;

      if (!item.description.trim()) {
        setLocalError(`Please enter a description for item ${index + 1}.`);
        return;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setLocalError(
          `Quantity for item ${index + 1} must be greater than zero.`
        );
        return;
      }

      if (!Number.isFinite(price) || price < 0) {
        setLocalError(`Enter a valid price for item ${index + 1}.`);
        return;
      }

      if (!Number.isFinite(discount) || discount < 0 || discount > gross) {
        setLocalError(
          `Discount for item ${index + 1} cannot exceed its amount.`
        );
        return;
      }

      const taxRate = Number(item.tax_rate);

      if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
        setLocalError(`Enter a valid GST rate for item ${index + 1}.`);
        return;
      }
    }

    if (
      Number(invoiceDiscount) >
      calculations.subtotal - calculations.itemDiscounts
    ) {
      setLocalError(
        "Invoice discount cannot exceed the amount after item discounts."
      );
      return;
    }

    await onSave({
      customer_id: customerId ? Number(customerId) : null,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim(),
      customer_phone: customerPhone.trim(),
      customer_gstin: customerGstin.trim().toUpperCase(),
      billing_address: billingAddress.trim(),
      place_of_supply_state_code: placeOfSupplyStateCode,
      invoice_date: invoiceDate,
      due_date: dueDate,
      discount: Number(invoiceDiscount) || 0,
      status,
      notes: notes.trim(),
      terms: terms.trim(),
      items: items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim() || "unit",
        unit_price: Number(item.unit_price),
        discount: Number(item.discount) || 0,
        tax_rate: Number(item.tax_rate) || 0,
      })),
    });
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  const labelClass =
    "mb-1.5 block text-xs font-semibold text-slate-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {invoice ? "Edit invoice" : "Create invoice"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add customer details, items and payment terms.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
            {(error || localError) && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{localError || error}</p>
              </div>
            )}

            <section>
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Customer information
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Select customer</label>
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    disabled={loadingCustomers}
                    className={inputClass}
                  >
                    <option value="">
                      {loadingCustomers
                        ? "Loading customers..."
                        : "Select customer or enter details manually"}
                    </option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.company_name
                          ? ` — ${customer.company_name}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && !loadingCustomers && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      No customers found. You can enter customer details below.
                    </p>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Customer name *</label>
                  <input
                    required={!customerId}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={Boolean(customerId)}
                    placeholder="Customer name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    disabled={Boolean(customerId)}
                    placeholder="customer@example.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    disabled={Boolean(customerId)}
                    placeholder="Phone number"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>GSTIN</label>
                  <input
                    maxLength={15}
                    value={customerGstin}
                    onChange={(e) =>
                      setCustomerGstin(
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                      )
                    }
                    disabled={Boolean(customerId)}
                    placeholder="15-character GSTIN"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Billing address</label>
                  <textarea
                    rows={2}
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    disabled={Boolean(customerId)}
                    placeholder="Billing address"
                    className={inputClass}
                  />
                </div>
              </div>

              {customerId && (
                <p className="mt-2 text-xs text-slate-500">
                  Customer details are taken from the selected customer record.
                  To change them, edit the customer first.
                </p>
              )}
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">
                Invoice details
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Invoice date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Due date</label>
                  <input
                    type="date"
                    min={invoiceDate}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Initial status</label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "draft" | "sent")
                    }
                    className={inputClass}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Place of Supply *</label>
                  <select
                    required
                    value={placeOfSupplyStateCode}
                    onChange={(e) =>
                      setPlaceOfSupplyStateCode(e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Select the state where the supply is taxable.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <h4 className="text-sm font-semibold text-slate-900">
                  GST calculation type
                </h4>

                {isGstConfigured ? (
                  <>
                    <p className="mt-2 text-sm text-slate-700">
                      Supplier state:{" "}
                      <strong>{selectedSupplierState?.name}</strong>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Place of Supply:{" "}
                      <strong>{selectedPlaceOfSupplyState?.name}</strong>
                    </p>

                    <div className="mt-3 rounded-lg bg-white px-3 py-3">
                      {isIntraState ? (
                        <>
                          <p className="text-sm font-semibold text-emerald-700">
                            Intra-state supply
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            GST will be divided into CGST + SGST.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-blue-700">
                            Inter-state supply
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            GST will be charged as IGST.
                          </p>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-amber-700">
                    Business state code or Place of Supply is missing. Configure
                    your business state in Settings and select Place of Supply
                    to see the GST breakup.
                  </p>
                )}
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Invoice items
                </h3>

                <button
                  type="button"
                  onClick={() => setItems((current) => [...current, emptyItem()])}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => {
                  const calculatedItem = calculations.items[index];

                  return (
                    <div
                      key={index}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Item {index + 1}
                        </p>

                        <button
                          type="button"
                          disabled={items.length === 1}
                          onClick={() =>
                            setItems((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index)
                            )
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-12">
                          <label className={labelClass}>Description *</label>
                          <input
                            required
                            maxLength={255}
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
                            placeholder="Product or service description"
                            className={inputClass}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className={labelClass}>Quantity</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                            className={inputClass}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className={labelClass}>Unit</label>
                          <input
                            maxLength={30}
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(index, "unit", e.target.value)
                            }
                            placeholder="unit"
                            className={inputClass}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className={labelClass}>Unit price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItem(index, "unit_price", e.target.value)
                            }
                            className={inputClass}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className={labelClass}>Discount</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) =>
                              updateItem(index, "discount", e.target.value)
                            }
                            className={inputClass}
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className={labelClass}>GST %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.tax_rate}
                            onChange={(e) =>
                              updateItem(index, "tax_rate", e.target.value)
                            }
                            className={inputClass}
                          />
                        </div>

                        <div className="flex items-end sm:col-span-2">
                          <div className="w-full rounded-lg bg-slate-50 px-3 py-2.5">
                            <p className="text-[10px] font-semibold uppercase text-slate-400">
                              Amount before GST
                            </p>
                            <p className="mt-0.5 text-sm font-semibold text-slate-800">
                              {money(
                                calculatedItem?.taxable ?? 0,
                                currency
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-700">
                            GST breakup preview
                          </p>
                          <span className="text-xs text-slate-500">
                            {Number(item.tax_rate) || 0}% GST
                          </span>
                        </div>

                        {isGstConfigured ? (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {isIntraState ? (
                              <>
                                <div>
                                  <p className="text-xs text-slate-500">CGST</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {money(
                                      calculatedItem?.cgstAmount ?? 0,
                                      currency
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">SGST</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-900">
                                    {money(
                                      calculatedItem?.sgstAmount ?? 0,
                                      currency
                                    )}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <div>
                                <p className="text-xs text-slate-500">IGST</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">
                                  {money(
                                    calculatedItem?.igstAmount ?? 0,
                                    currency
                                  )}
                                </p>
                              </div>
                            )}

                            <div>
                              <p className="text-xs text-slate-500">Total GST</p>
                              <p className="mt-1 text-sm font-semibold text-indigo-700">
                                {money(
                                  calculatedItem?.gstAmount ?? 0,
                                  currency
                                )}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-slate-500">
                                Amount incl. GST
                              </p>
                              <p className="mt-1 text-sm font-semibold text-slate-900">
                                {money(
                                  calculatedItem?.lineTotal ?? 0,
                                  currency
                                )}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-700">
                            Select your business state and Place of Supply to
                            calculate the GST components.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-6 border-t border-slate-100 pt-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    rows={3}
                    maxLength={10000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes for your customer"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Terms and conditions</label>
                  <textarea
                    rows={3}
                    maxLength={10000}
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Payment terms and conditions"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">
                  Invoice summary
                </h3>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-600">
                    Subtotal
                  </label>
                  <span className="text-sm font-medium text-slate-800">
                    {money(calculations.subtotal, currency)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">
                    Item discounts
                  </span>
                  <span className="text-sm text-slate-800">
                    − {money(calculations.itemDiscounts, currency)}
                  </span>
                </div>

                <div className="mt-3">
                  <label className={labelClass}>
                    Additional invoice discount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoiceDiscount}
                    onChange={(e) => setInvoiceDiscount(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">
                    Taxable amount
                  </span>
                  <span className="text-sm font-medium text-slate-800">
                    {money(
                      calculations.taxableSubtotal - calculations.discount,
                      currency
                    )}
                  </span>
                </div>

                <div className="my-4 border-t border-slate-200" />

                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  GST breakup
                </p>

                {isGstConfigured ? (
                  isIntraState ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">CGST</span>
                        <span className="text-sm font-medium text-slate-800">
                          {money(calculations.cgstAmount, currency)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">SGST</span>
                        <span className="text-sm font-medium text-slate-800">
                          {money(calculations.sgstAmount, currency)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-600">IGST</span>
                      <span className="text-sm font-medium text-slate-800">
                        {money(calculations.igstAmount, currency)}
                      </span>
                    </div>
                  )
                ) : (
                  <p className="text-xs text-amber-700">
                    GST breakup will appear after selecting both states.
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-700">
                    Total GST
                  </span>
                  <span className="text-sm font-semibold text-indigo-700">
                    {money(calculations.taxAmount, currency)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="font-semibold text-slate-900">
                    Grand total
                  </span>
                  <span className="text-xl font-bold text-indigo-700">
                    {money(calculations.total, currency)}
                  </span>
                </div>

                <p className="mt-3 text-[11px] text-slate-500">
                  GST amounts shown here are previews. Final amounts are
                  calculated and rounded by the server when the invoice is saved.
                </p>
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || loadingCustomers}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {invoice ? "Save changes" : "Create invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}