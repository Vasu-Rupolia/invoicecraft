import { useState } from "react";
import {
  Download,
  Loader2,
  Printer,
  Mail,
} from "lucide-react";

import type { Business } from "../../types";
import type { Quotation } from "../../services/quotationService";
import DocumentEmailModal from "../documents/DocumentEmailModal";

interface Props {
  quotation: Quotation;
  business: Business | null;
}

type PdfAction = "download" | "print" | null;

export default function QuotationPdfActions({
  quotation,
  business,
}: Props) {
  const [loading, setLoading] = useState<PdfAction>(null);
  const [error, setError] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);

  const businessId = Number(business?.id);

  const handleAction = async (action: "download" | "print") => {
    if (loading) return;

    setError("");
    setLoading(action);

    try {
      const pdfUtils = await import("../../utils/quotationPdf");

      if (action === "download") {
        await pdfUtils.downloadQuotationPdf(quotation, business);
      } else {
        await pdfUtils.printQuotationPdf(quotation, business);
      }
    } catch (err) {
      console.error("Quotation PDF action failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate quotation PDF.",
      );
    } finally {
      setLoading(null);
    }
  };

  const generatePdf = async (): Promise<Blob> => {
    const pdfUtils = await import("../../utils/quotationPdf");

    return pdfUtils.generateQuotationPdfBlob(quotation, business);
  };

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => void handleAction("download")}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "download" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}

            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={() => void handleAction("print")}
            disabled={loading !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "print" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Printer size={16} />
            )}

            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            disabled={!businessId || loading !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mail size={16} />
            <span>Send Email</span>
          </button>
        </div>

        {error && (
          <p className="max-w-xs text-right text-xs text-red-600">
            {error}
          </p>
        )}
      </div>

      {showEmailModal && businessId > 0 && (
        <DocumentEmailModal
          businessId={businessId}
          businessName={business?.name || "Business"}
          documentType="quotation"
          documentId={quotation.id}
          documentNumber={quotation.quotation_number}
          customerEmail={quotation.customer_email}
          generatePdf={generatePdf}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </>
  );
}