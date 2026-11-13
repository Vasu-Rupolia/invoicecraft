import { useState } from "react";
import { Download, Printer, LoaderCircle } from "lucide-react";
import type { Business, Invoice } from "../../types";

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
    </>
  );
}