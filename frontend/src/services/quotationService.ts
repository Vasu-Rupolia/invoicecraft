import api from "./api";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted";

export interface QuotationItemPayload {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

export interface QuotationPayload {
  customer_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_gstin: string;
  billing_address: string;
  quotation_date: string;
  valid_until: string;
  discount: number;
  status: "draft" | "sent";
  notes: string;
  terms: string;
  items: QuotationItemPayload[];
}

export interface QuotationItem extends QuotationItemPayload {
  id: number;
  quotation_id: number;
  tax_amount: number | string;
  line_total: number | string;
}

export interface Quotation {
  id: number;
  business_profile_id: number;
  customer_id: number | null;
  quotation_number: string;
  quotation_date: string;
  valid_until: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_gstin: string | null;
  billing_address: string | null;
  subtotal: number | string;
  discount: number | string;
  tax_amount: number | string;
  total: number | string;
  currency: string;
  status: QuotationStatus;
  notes: string | null;
  terms: string | null;
  items: QuotationItem[];
  created_at?: string;
  updated_at?: string;
}

export interface QuotationListResult {
  data: Quotation[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface QuotationFilters {
  search?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  per_page?: number;
}

export async function getQuotations(
  businessId: number | string,
  filters: QuotationFilters = {},
): Promise<QuotationListResult> {
  const response = await api.get(
    `/businesses/${businessId}/quotations`,
    { params: filters },
  );

  return response.data.quotations;
}

export async function getQuotation(
  businessId: number | string,
  quotationId: number,
): Promise<Quotation> {
  const response = await api.get(
    `/businesses/${businessId}/quotations/${quotationId}`,
  );

  return response.data.quotation;
}

export async function createQuotation(
  businessId: number | string,
  payload: QuotationPayload,
): Promise<Quotation> {
  const response = await api.post(
    `/businesses/${businessId}/quotations`,
    payload,
  );

  return response.data.quotation;
}

export async function updateQuotation(
  businessId: number | string,
  quotationId: number,
  payload: QuotationPayload,
): Promise<Quotation> {
  const response = await api.put(
    `/businesses/${businessId}/quotations/${quotationId}`,
    payload,
  );

  return response.data.quotation;
}

export async function deleteQuotation(
  businessId: number | string,
  quotationId: number,
): Promise<void> {
  await api.delete(
    `/businesses/${businessId}/quotations/${quotationId}`,
  );
}

export async function convertQuotationToInvoice(
  businessId: number | string,
  quotationId: number,
) {
  const response = await api.post(
    `/businesses/${businessId}/quotations/${quotationId}/convert-to-invoice`,
  );

  return response.data.invoice;
}