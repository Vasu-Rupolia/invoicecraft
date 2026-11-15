import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  CircleHelp,
  FileText,
  IndianRupee,
  LayoutDashboard,
  ListChecks,
  ReceiptText,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const sections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "business-profile", label: "Business Profile" },
  { id: "customers", label: "Customers" },
  { id: "invoices", label: "Invoices" },
  { id: "quotations", label: "Quotations" },
  { id: "gst", label: "GST & Taxation" },
  { id: "payments", label: "Payments" },
  { id: "faq", label: "FAQs" },
];

const quickStart = [
  "Create your InvoiceCraft account and log in.",
  "Create or select your business workspace.",
  "Complete your business profile and GST details.",
  "Add your customers with their contact and billing details.",
  "Create your first quotation or invoice.",
  "Download the PDF and share it with your customer.",
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
        {eyebrow}
      </p>
      <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}

function GuideCard({
  icon: Icon,
  title,
  description,
  to,
  linkLabel = "Open section",
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  to: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon size={21} />
      </div>

      <h3 className="font-semibold text-slate-900">{title}</h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
        {description}
      </p>

      <Link
        to={to}
        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
      >
        {linkLabel}
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

function InfoRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-0">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{children}</p>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="space-y-10 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-9 text-white sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-indigo-100">
            <BookOpen size={14} />
            INVOICECRAFT USER GUIDE
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to manage your business documents.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Welcome to InvoiceCraft. This guide will help you set up your
            business, manage customers, create professional invoices and
            quotations, and understand GST calculations.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#getting-started"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50"
            >
              <ListChecks size={17} />
              Start here
            </a>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <LayoutDashboard size={17} />
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
            Explore InvoiceCraft
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            What would you like to do?
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <GuideCard
            icon={Building2}
            title="Set up your business"
            description="Add your business details, address, logo and GSTIN before creating documents."
            to="/settings"
          />
          <GuideCard
            icon={Users}
            title="Manage customers"
            description="Maintain customer contact details, GSTIN and billing or shipping addresses."
            to="/customers"
          />
          <GuideCard
            icon={FileText}
            title="Create invoices"
            description="Create invoices, add line items, apply discounts and generate PDF documents."
            to="/invoices"
          />
          <GuideCard
            icon={ReceiptText}
            title="Create quotations"
            description="Prepare quotations for customers and convert accepted quotations into invoices."
            to="/quotations"
          />
          <GuideCard
            icon={IndianRupee}
            title="Understand GST"
            description="Learn how Place of Supply determines CGST, SGST or IGST in your documents."
            to="#gst"
            linkLabel="Read GST guide"
          />
          <GuideCard
            icon={CircleHelp}
            title="Frequently asked questions"
            description="Find answers to common questions about invoices, quotations and document management."
            to="#faq"
            linkLabel="View FAQs"
          />
        </div>
      </section>

      {/* Main guide layout */}
      <div className="grid items-start gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Table of contents */}
        <aside className="lg:sticky lg:top-28">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 px-2 text-sm font-bold text-slate-900">
              On this page
            </h2>

            <nav className="space-y-1">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-lg px-3 py-2.5 text-sm text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Guide content */}
        <div className="min-w-0 space-y-8">
          <section
            id="getting-started"
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          >
            <SectionHeading
              eyebrow="01 · First steps"
              title="Getting Started"
              description="Follow these steps to get your InvoiceCraft workspace ready. You can complete them in order and start creating documents."
            />

            <div className="space-y-4">
              {quickStart.map((item, index) => (
                <div key={item} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-6 text-slate-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-indigo-50 p-4">
              <p className="text-sm font-semibold text-indigo-900">
                Helpful tip
              </p>
              <p className="mt-1 text-sm leading-6 text-indigo-800">
                Complete your business profile first. Your business details
                are used in your invoice and quotation documents.
              </p>
              <Link
                to="/settings"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
              >
                Set up business profile <ArrowRight size={15} />
              </Link>
            </div>
          </section>

          <section
            id="business-profile"
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          >
            <SectionHeading
              eyebrow="02 · Workspace"
              title="Business Profile"
              description="Your business profile contains the details that identify your business on invoices and quotations."
            />

            <InfoRow title="Business name and contact details">
              Add your business name, email, phone number and complete address.
              Keep these details accurate so they appear correctly on your
              documents.
            </InfoRow>

            <InfoRow title="Business logo">
              Add your business logo from Settings to give your PDF documents
              a professional and recognizable identity.
            </InfoRow>

            <InfoRow title="GSTIN and state">
              If your business is registered under GST, enter the correct
              GSTIN and state details. State information is important for
              calculating the applicable GST type.
            </InfoRow>

            <Link
              to="/settings"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Open Settings <ArrowRight size={16} />
            </Link>
          </section>

          <section
            id="customers"
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          >
            <SectionHeading
              eyebrow="03 · Contacts"
              title="Customers"
              description="Save customer information once and use it when preparing invoices and quotations."
            />

            <InfoRow title="Add a customer">
              Open Customers and add the customer's name, email, phone number
              and address.
            </InfoRow>

            <InfoRow title="GST details">
              For GST-registered customers, enter their GSTIN and correct
              state details. This helps determine the Place of Supply for
              document calculations.
            </InfoRow>

            <InfoRow title="Billing and shipping addresses">
              You can maintain billing and shipping address information
              separately, where applicable.
            </InfoRow>

            <Link
              to="/customers"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Open Customers <ArrowRight size={16} />
            </Link>
          </section>

          <section
            id="invoices"
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          >
            <SectionHeading
              eyebrow="04 · Sales documents"
              title="Invoices"
              description="Use invoices to record the products or services supplied to your customers and the amount payable."
            />

            <InfoRow title="Create an invoice">
              Open Invoices, start a new invoice, select a customer and add
              the required items, quantities and prices.
            </InfoRow>

            <InfoRow title="Discounts and taxes">
              Add applicable item-level or invoice-level discounts and review
              the calculated totals and GST breakup before saving.
            </InfoRow>

            <InfoRow title="Invoice status">
              Invoices can have statuses such as Draft, Sent, Partially Paid,
              Paid or Overdue, depending on their state and payment activity.
            </InfoRow>

            <InfoRow title="PDF and printing">
              Open an invoice to review its details and use the available PDF
              download or print action.
            </InfoRow>

            <Link
              to="/invoices"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Open Invoices <ArrowRight size={16} />
            </Link>
          </section>

          <section
            id="quotations"
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          >
            <SectionHeading
              eyebrow="05 · Estimates"
              title="Quotations"
              description="Create quotations to share proposed prices and details with customers before raising an invoice."
            />

            <InfoRow title="Prepare a quotation">
              Select a customer, add the items or services, enter prices and
              review discounts and GST before saving.
            </InfoRow>

            <InfoRow title="Quotation status">
              Quotations support statuses including Draft, Sent, Accepted,
              Rejected, Expired and Converted.
            </InfoRow>

            <InfoRow title="Convert to invoice">
              When a quotation is accepted, use the conversion action to
              create an invoice from it. Review the resulting invoice before
              sharing it.
            </InfoRow>

            <Link
              to="/quotations"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Open Quotations <ArrowRight size={16} />
            </Link>
          </section>

          <section
            id="gst"
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          >
            <SectionHeading
              eyebrow="06 · Indian taxation"
              title="GST & Place of Supply"
              description="InvoiceCraft calculates the GST breakup using the business location and the customer's Place of Supply."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">
                  Intra-state supply
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  When the Place of Supply is in the same state as the
                  supplier, GST is generally split into CGST and SGST.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">
                  Inter-state supply
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  When the Place of Supply is in a different state, IGST is
                  generally applicable.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                Important
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Verify your business state, customer state and Place of Supply
                before finalizing a tax document. GST applicability can depend
                on the nature of the supply and applicable tax rules. Consult
                your tax professional when unsure.
              </p>
            </div>
          </section>

          <section
            id="payments"
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          >
            <SectionHeading
              eyebrow="07 · Collections"
              title="Payments"
              description="Record payments received against invoices to keep track of outstanding amounts."
            />

            <InfoRow title="Record a payment">
              Open the relevant invoice and use its payment action to record
              the amount received.
            </InfoRow>

            <InfoRow title="Payment methods">
              Available payment methods include Cash, UPI, Card and Bank
              Transfer.
            </InfoRow>

            <InfoRow title="Partial and full payments">
              A partial payment reduces the outstanding balance. Once the
              invoice is fully paid, its status is updated accordingly.
            </InfoRow>

            <Link
              to="/invoices"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              View Invoices <ArrowRight size={16} />
            </Link>
          </section>

          <section
            id="faq"
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
          >
            <SectionHeading
              eyebrow="08 · Help"
              title="Frequently Asked Questions"
              description="A few quick answers to common InvoiceCraft questions."
            />

            <InfoRow title="Can I manage more than one business?">
              Yes. You can create multiple business workspaces and switch
              between them using the business selector in the header.
            </InfoRow>

            <InfoRow title="Can I edit an invoice after recording a payment?">
              Invoices with recorded payments have editing restrictions to
              protect payment records. Review the invoice's available actions
              before making changes.
            </InfoRow>

            <InfoRow title="Can I convert a quotation into an invoice?">
              Yes. An accepted quotation can be converted into an invoice.
            </InfoRow>

            <InfoRow title="Why is GST split into CGST and SGST on one invoice but IGST on another?">
              The GST type is determined by the relationship between the
              supplier's state and the Place of Supply. Same-state supplies
              generally use CGST and SGST, while inter-state supplies
              generally use IGST.
            </InfoRow>

            <InfoRow title="Where can I update my business details or logo?">
              Open Settings from the sidebar or your profile menu.
            </InfoRow>
          </section>

          {/* Closing CTA */}
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Ready to create your first document?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Your workspace is ready. Head over to Invoices and get
                  started.
                </p>
              </div>

              <Link
                to="/invoices"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Create an invoice <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <CheckCircle2 size={14} />
        InvoiceCraft Help & Guide
      </div>
    </div>
  );
}