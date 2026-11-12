import api from "./api";
import type { Customer } from "../types";

export type CustomerPayload = {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  gstin: string;
  billing_address: string;
  shipping_address: string;
  notes: string;
};

export type CustomerPagination = {
  data: Customer[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export async function getCustomers(
  businessId: number,
  search = "",
  page = 1,
  perPage = 10
): Promise<CustomerPagination> {
  const response = await api.get(
    `/businesses/${businessId}/customers`,
    {
      params: {
        search: search || undefined,
        page,
        per_page: perPage,
      },
    }
  );

  return response.data.customers;
}

export async function createCustomer(
  businessId: number,
  payload: CustomerPayload
): Promise<Customer> {
  const response = await api.post(
    `/businesses/${businessId}/customers`,
    payload
  );

  return response.data.customer;
}

export async function updateCustomer(
  businessId: number,
  customerId: number,
  payload: CustomerPayload
): Promise<Customer> {
  const response = await api.put(
    `/businesses/${businessId}/customers/${customerId}`,
    payload
  );

  return response.data.customer;
}

export async function deleteCustomer(
  businessId: number,
  customerId: number
): Promise<void> {
  await api.delete(
    `/businesses/${businessId}/customers/${customerId}`
  );
}

export async function getCustomer(
  businessId: number,
  customerId: number
): Promise<Customer> {
  const response = await api.get(
    `/businesses/${businessId}/customers/${customerId}`
  );

  return response.data.customer;
}