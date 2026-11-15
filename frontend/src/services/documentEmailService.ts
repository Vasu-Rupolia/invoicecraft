import api from "./api";

export type DocumentType = "invoice" | "quotation";

export type DocumentEmailStatus = "pending" | "sent" | "failed";

export interface DocumentEmailLog {
  id: number;
  business_profile_id: number;
  document_type: DocumentType;
  document_id: number;
  document_number: string;
  recipient: string;
  subject: string;
  message: string | null;
  status: DocumentEmailStatus;
  sent_by: number | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentEmailPayload {
  recipient: string;
  subject: string;
  message: string;
  pdf: Blob;
}

export interface DocumentEmailResponse {
  message: string;
  email: DocumentEmailLog;
}

export interface DocumentEmailPagination {
  data: DocumentEmailLog[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface DocumentEmailFilters {
  document_type?: DocumentType;
  document_id?: number;
  page?: number;
}

export interface ResendDocumentEmailPayload {
  recipient?: string;
  subject?: string;
  message?: string | null;
}

const sendDocumentEmail = async (
  businessId: number,
  documentType: DocumentType,
  documentId: number,
  payload: DocumentEmailPayload,
): Promise<DocumentEmailResponse> => {
  const formData = new FormData();

  formData.append("pdf", payload.pdf, `${documentType}.pdf`);
  formData.append("recipient", payload.recipient);
  formData.append("subject", payload.subject);
  formData.append("message", payload.message);

  const response = await api.post(
    `/businesses/${businessId}/${documentType === "invoice" ? "invoices" : "quotations"}/${documentId}/email`,
    formData,
  );

  return response.data;
};

export async function sendInvoiceEmail(
  businessId: number,
  invoiceId: number,
  payload: DocumentEmailPayload,
): Promise<DocumentEmailResponse> {
  return sendDocumentEmail(
    businessId,
    "invoice",
    invoiceId,
    payload,
  );
}

export async function sendQuotationEmail(
  businessId: number,
  quotationId: number,
  payload: DocumentEmailPayload,
): Promise<DocumentEmailResponse> {
  return sendDocumentEmail(
    businessId,
    "quotation",
    quotationId,
    payload,
  );
}

export async function getDocumentEmailHistory(
  businessId: number,
  filters: DocumentEmailFilters = {},
): Promise<DocumentEmailPagination> {
  const response = await api.get(
    `/businesses/${businessId}/email-logs`,
    {
      params: {
        document_type: filters.document_type,
        document_id: filters.document_id,
        page: filters.page || 1,
      },
    },
  );

  return response.data;
}

export async function resendDocumentEmail(
  businessId: number,
  emailLogId: number,
  payload: ResendDocumentEmailPayload = {},
): Promise<DocumentEmailResponse> {
  const response = await api.post(
    `/businesses/${businessId}/email-logs/${emailLogId}/resend`,
    payload,
  );

  return response.data;
}