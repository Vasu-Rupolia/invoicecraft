import api from "./api";
import type { Invoice } from "../types";

export type InvoiceItemPayload = {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  tax_rate: number;
};

export type InvoicePayload = {
  customer_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_gstin: string;
  billing_address: string;
  invoice_date: string;
  due_date: string;
  discount: number;
  status: "draft" | "sent";
  notes: string;
  terms: string;
  items: InvoiceItemPayload[];
};

export type InvoicePagination = {
  data: Invoice[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type InvoiceFilters = {
  search?: string;
  status?: string;
  page?: number;
  perPage?: number;
};

export async function getInvoices(
  businessId: number,
  filters: InvoiceFilters = {}
): Promise<InvoicePagination> {
  const response = await api.get(
    `/businesses/${businessId}/invoices`,
    {
      params: {
        search: filters.search || undefined,
        status:
          filters.status && filters.status !== "all"
            ? filters.status
            : undefined,
        page: filters.page || 1,
        per_page: filters.perPage || 10,
      },
    }
  );

  return response.data.invoices;
}

export async function getInvoice(
  businessId: number,
  invoiceId: number
): Promise<Invoice> {
  const response = await api.get(
    `/businesses/${businessId}/invoices/${invoiceId}`
  );

  return response.data.invoice;
}

export async function createInvoice(
  businessId: number,
  payload: InvoicePayload
): Promise<Invoice> {
  const response = await api.post(
    `/businesses/${businessId}/invoices`,
    payload
  );

  return response.data.invoice;
}

export async function updateInvoice(
  businessId: number,
  invoiceId: number,
  payload: InvoicePayload
): Promise<Invoice> {
  const response = await api.put(
    `/businesses/${businessId}/invoices/${invoiceId}`,
    payload
  );

  return response.data.invoice;
}

export async function deleteInvoice(
  businessId: number,
  invoiceId: number
): Promise<void> {
  await api.delete(
    `/businesses/${businessId}/invoices/${invoiceId}`
  );
}