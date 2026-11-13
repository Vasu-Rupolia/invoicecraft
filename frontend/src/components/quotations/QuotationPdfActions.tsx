import { useState } from "react";
import {
  Download,
  Loader2,
  Printer,
} from "lucide-react";
import type { Business } from "../../types";
import type { Quotation } from "../../services/quotationService";

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

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
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
      </div>

      {error && (
        <p className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}