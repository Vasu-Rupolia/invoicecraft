import api from "./api";

export interface ReportsFilters {
  from_date: string;
  to_date: string;
}

export interface ReportsSummary {
  invoice_count: number;
  invoiced_amount: number;
  received_amount: number;
  outstanding_amount: number;
  overdue_amount: number;
  overdue_count: number;
  payment_count: number;
}

export interface MonthlyRevenue {
  month: string;
  label: string;
  revenue: number;
}

export interface PaymentMethodReport {
  payment_method: string;
  payment_count: number;
  amount: number;
}

export interface OutstandingInvoice {
  id: number;
  invoice_number: string;
  customer_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  is_overdue: boolean;
}

export interface ReportsData {
  filters: ReportsFilters;
  summary: ReportsSummary;
  monthly_revenue: MonthlyRevenue[];
  payment_methods: PaymentMethodReport[];
  outstanding_invoices: OutstandingInvoice[];
}

export const getReports = async (
  businessId: number,
  filters: ReportsFilters
): Promise<ReportsData> => {
  const response = await api.get(
    `/businesses/${businessId}/reports`,
    {
      params: filters,
    }
  );

  return response.data;
};