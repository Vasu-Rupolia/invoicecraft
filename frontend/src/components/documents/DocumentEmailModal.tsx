import { useEffect, useState } from "react";
import {
  X,
  Mail,
  Send,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

import {
  getDocumentEmailHistory,
  resendDocumentEmail,
  sendInvoiceEmail,
  sendQuotationEmail,
} from "../../services/documentEmailService";

import type {
  DocumentEmailLog,
  DocumentType,
} from "../../services/documentEmailService";

type Props = {
  businessId: number;
  businessName: string;
  documentType: DocumentType;
  documentId: number;
  documentNumber: string;
  customerEmail?: string | null;
  onClose: () => void;
  generatePdf: () => Promise<Blob>;
};

const getErrorMessage = (error: unknown) => {
  const apiError = error as {
    response?: {
      data?: {
        message?: string;
      };
    };
    message?: string;
  };

  return (
    apiError.response?.data?.message ||
    apiError.message ||
    "Something went wrong. Please try again."
  );
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusStyles: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  pending: "bg-amber-50 text-amber-700",
};

export default function DocumentEmailModal({
  businessId,
  businessName,
  documentType,
  documentId,
  documentNumber,
  customerEmail,
  onClose,
  generatePdf,
}: Props) {
  const documentLabel =
    documentType === "invoice" ? "Invoice" : "Quotation";

  const [recipient, setRecipient] = useState(customerEmail || "");
  const [subject, setSubject] = useState(
    `${documentLabel} ${documentNumber} from ${businessName}`,
  );
  const [message, setMessage] = useState(
    `Dear Customer,\n\nPlease find attached ${documentLabel.toLowerCase()} ${documentNumber}.\n\nThank you for your business.\n\nRegards,\n${businessName}`,
  );

  const [history, setHistory] = useState<DocumentEmailLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sentRecipient, setSentRecipient] = useState("");

  const [sentSuccessfully, setSentSuccessfully] = useState(false);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);

      const result = await getDocumentEmailHistory(businessId, {
        document_type: documentType,
        document_id: documentId,
      });

      setHistory(result.data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [businessId, documentType, documentId]);

  const handleSend = async () => {
    setError("");
    setSuccess("");
    setSentRecipient("");

    if (!recipient.trim()) {
      setError("Please enter the recipient email address.");
      return;
    }

    if (!subject.trim()) {
      setError("Please enter an email subject.");
      return;
    }

    try {
      setSending(true);

      const pdf = await generatePdf();

      if (!(pdf instanceof Blob) || pdf.size === 0) {
        throw new Error("Unable to generate the PDF attachment.");
      }

      const payload = {
        recipient: recipient.trim(),
        subject: subject.trim(),
        message,
        pdf,
      };

      if (documentType === "invoice") {
        await sendInvoiceEmail(businessId, documentId, payload);
      } else {
        await sendQuotationEmail(businessId, documentId, payload);
      }

      setSentRecipient(recipient.trim());
      setSuccess(`${documentLabel} email sent successfully.`);
      setSentSuccessfully(true);

      await loadHistory();
    } catch (sendError) {
      setError(getErrorMessage(sendError));
      await loadHistory();
    } finally {
      setSending(false);
    }
  };

  const handleResend = async (email: DocumentEmailLog) => {
    setError("");
    setSuccess("");
    setSentRecipient("");

    try {
      setResendingId(email.id);

      await resendDocumentEmail(businessId, email.id);

      setSentRecipient(email.recipient);
      setSuccess(`Email resent successfully.`);
      await loadHistory();
    } catch (resendError) {
      setError(getErrorMessage(resendError));
      await loadHistory();
    } finally {
      setResendingId(null);
    }
  };

  const handleClose = () => {
    if (sending || resendingId !== null) return;
    onClose();
  };

  const resetSentState = () => {
    if (sentSuccessfully) {
      setSentSuccessfully(false);
      setSuccess("");
      setSentRecipient("");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Mail size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Email {documentLabel}
              </h2>
              <p className="text-xs text-slate-500">
                {documentNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={sending || resendingId !== null}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {(success || error) && (
          <div className="z-10 shrink-0 border-b border-slate-100 bg-white px-5 py-3">
            {success && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm"
              >
                <CheckCircle2
                  size={22}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {success}
                  </p>

                  {sentRecipient && (
                    <p className="mt-1 break-all text-xs text-emerald-700">
                      Recipient: {sentRecipient}
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Recipient email
              </label>

              <input
                type="email"
                value={recipient}
                onChange={(event) => {
                  setRecipient(event.target.value);
                  resetSentState();
                }}
                placeholder="customer@example.com"
                disabled={sending}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Subject
              </label>

              <input
                type="text"
                value={subject}
                onChange={(event) => {
                  setSubject(event.target.value);
                  resetSentState();
                }}
                placeholder="Email subject"
                disabled={sending}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Message
              </label>

              <textarea
                rows={6}
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  resetSentState();
                }}
                disabled={sending}
                className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
              <Mail size={17} className="shrink-0 text-indigo-500" />
              <span>
                {documentNumber}.pdf will be attached automatically.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {sentSuccessfully && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              )}

              <button
                type="button"
                onClick={handleSend}
                disabled={
                  sending ||
                  !businessId ||
                  sentSuccessfully ||
                  resendingId !== null
                }
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  sentSuccessfully
                    ? "bg-emerald-600"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : sentSuccessfully ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <Send size={16} />
                )}

                {sending
                  ? "Sending..."
                  : sentSuccessfully
                    ? "Sent Successfully"
                    : "Send Email"}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Email history
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Previous emails for this {documentLabel.toLowerCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={loadingHistory || sending || resendingId !== null}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                title="Refresh history"
              >
                <RefreshCw
                  size={16}
                  className={loadingHistory ? "animate-spin" : ""}
                />
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center gap-2 py-7 text-sm text-slate-500">
                <Loader2 size={17} className="animate-spin" />
                Loading email history...
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((email) => (
                  <div
                    key={email.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-semibold text-slate-800">
                          {email.recipient}
                        </p>

                        <p className="mt-1 break-words text-xs text-slate-500">
                          {email.subject}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          statusStyles[email.status] ||
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {email.status === "sent" ? (
                          <CheckCircle2 size={13} />
                        ) : email.status === "failed" ? (
                          <AlertCircle size={13} />
                        ) : (
                          <Clock size={13} />
                        )}

                        {email.status}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">
                        {formatDate(email.sent_at || email.created_at)}
                      </span>

                      {email.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => void handleResend(email)}
                          disabled={resendingId !== null || sending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          {resendingId === email.id ? (
                            <Loader2
                              size={13}
                              className="animate-spin"
                            />
                          ) : (
                            <RefreshCw size={13} />
                          )}

                          Resend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center">
                <Mail
                  size={22}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-2 text-sm font-medium text-slate-600">
                  No emails sent yet
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Sent emails will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}