import { useState } from "react";
import {
  Download,
  Printer,
  LoaderCircle,
  Mail,
} from "lucide-react";

import type { Business, Invoice } from "../../types";
import DocumentEmailModal from "../documents/DocumentEmailModal";

type Props = {
  invoice: Invoice;
  business: Business | null;
};

export default function InvoicePdfActions({
  invoice,
  business,
}: Props) {
  const [loading, setLoading] = useState<"download" | "print" | null>(
    null,
  );
  const [showEmailModal, setShowEmailModal] = useState(false);

  const businessId = Number(business?.id);

  const handleAction = async (action: "download" | "print") => {
    try {
      setLoading(action);

      const pdfUtils = await import("../../utils/invoicePdf");

      if (action === "download") {
        await pdfUtils.downloadInvoicePdf(invoice, business);
      } else {
        await pdfUtils.printInvoicePdf(invoice, business);
      }
    } catch (error) {
      console.error("Invoice PDF error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Unable to generate invoice PDF.",
      );
    } finally {
      setLoading(null);
    }
  };

  const generatePdf = async (): Promise<Blob> => {
    const pdfUtils = await import("../../utils/invoicePdf");

    return pdfUtils.generateInvoicePdfBlob(invoice, business);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => handleAction("download")}
        disabled={loading !== null}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading === "download" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Download PDF
      </button>

      <button
        type="button"
        onClick={() => handleAction("print")}
        disabled={loading !== null}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading === "print" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        Print
      </button>

      <button
        type="button"
        onClick={() => setShowEmailModal(true)}
        disabled={!businessId || loading !== null}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Mail className="h-4 w-4" />
        Send Email
      </button>

      {showEmailModal && businessId > 0 && (
        <DocumentEmailModal
          businessId={businessId}
          businessName={business?.name || "Business"}
          documentType="invoice"
          documentId={invoice.id}
          documentNumber={invoice.invoice_number}
          customerEmail={invoice.customer_email}
          generatePdf={generatePdf}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </>
  );
}