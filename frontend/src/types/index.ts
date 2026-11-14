export type User = {
  id: number;
  name: string;
  email: string;
  avatar_path?: string | null;
  avatar_url?: string | null;
};

export type Business = {
  id: number;
  name: string;
  business_type: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  state_code?: string | null;
  country?: string | null;
  postal_code?: string | null;
  gstin?: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
  currency?: string;
  invoice_prefix?: string;
  quotation_prefix?: string;
  timezone?: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  business_name: string;
  business_type: string;
};

export type Customer = {
  id: number;
  business_profile_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  gstin: string | null;
  state: string | null;
  state_code: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardMetrics = {
  total_revenue: number;
  monthly_revenue: number;
  outstanding_amount: number;
  total_invoices: number;
  pending_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  total_customers: number;
};

export type RecentInvoice = {
  id: number;
  invoice_number: string;
  customer_name: string;
  invoice_date: string;
  due_date: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  currency: string;
};

export type DashboardData = {
  business: {
    id: number;
    name: string;
    currency: string;
  };
  metrics: DashboardMetrics;
  recent_invoices: RecentInvoice[];
};

export type PaymentMethod =
  | "cash"
  | "upi"
  | "bank_transfer"
  | "card"
  | "cheque"
  | "other";

export type Payment = {
  id: number;
  business_profile_id: number;
  invoice_id: number;
  payment_number: string | null;
  amount: number;
  payment_method: PaymentMethod;
  transaction_reference: string | null;
  payment_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentPayload = {
  amount: number;
  payment_method: PaymentMethod;
  transaction_reference: string;
  payment_date: string;
  notes: string;
};

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue";

export type InvoiceItem = {
  id?: number;
  invoice_id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  line_total: number;
};

export type Invoice = {
  id: number;
  business_profile_id: number;
  customer_id: number | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_gstin: string | null;
  billing_address: string | null;
  subtotal: number;
  discount: number;
  tax_amount: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  tax_type?: string | null;
  place_of_supply_state?: string | null;
  place_of_supply_state_code?: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  status: InvoiceStatus;
  notes: string | null;
  terms: string | null;
  items: InvoiceItem[];
  payments?: Payment[];
  created_at: string;
  updated_at: string;
};