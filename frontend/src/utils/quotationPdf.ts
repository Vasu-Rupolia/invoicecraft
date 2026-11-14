import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Business } from "../types";
import type { Quotation } from "../services/quotationService";

const PAGE_WIDTH = 210;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT_NAME = "NotoSans";
const BOTTOM_LIMIT = 276;

type PdfDocument = jsPDF & {
  lastAutoTable: {
    finalY: number;
  };
};

const amount = (value: number | string | null | undefined) =>
  Number(value) || 0;

const money = (value: number | string | null | undefined, currency = "INR") => {
  const valueAmount = amount(value);

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valueAmount);
  } catch {
    return `${currency} ${valueAmount.toFixed(2)}`;
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const dateValue = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(dateValue.getTime())) return "—";

  return dateValue.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatStatus = (status: string) =>
  status.replaceAll("_", " ").toUpperCase();

const formatTaxType = (taxType?: string | null) => {
  if (!taxType) return "—";

  return taxType
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .toUpperCase();
};

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)),
    );
  }

  return btoa(binary);
};

const registerFonts = async (doc: jsPDF) => {
  const fontFiles = [
    { file: "NotoSans-Regular.ttf", style: "normal" },
    { file: "NotoSans-Bold.ttf", style: "bold" },
  ] as const;

  for (const font of fontFiles) {
    const response = await fetch(
      `${import.meta.env.BASE_URL}fonts/${font.file}`,
    );

    if (!response.ok) {
      throw new Error(`Unable to load PDF font: ${font.file}`);
    }

    const base64 = arrayBufferToBase64(await response.arrayBuffer());

    doc.addFileToVFS(font.file, base64);
    doc.addFont(font.file, FONT_NAME, font.style);
  }

  doc.setFont(FONT_NAME, "normal");
};

const getLogoUrl = (business: Business) => {
  const path = business.logo_path || business.logo_url;

  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    if (import.meta.env.DEV) {
      const url = new URL(path);

      if (url.pathname.startsWith("/storage/")) {
        return url.pathname;
      }
    }

    return path;
  }

  const normalizedPath = path.replace(/^\/+/, "");
  const storagePath = normalizedPath.startsWith("storage/")
    ? normalizedPath
    : `storage/${normalizedPath}`;

  if (import.meta.env.DEV) {
    return `/${storagePath}`;
  }

  const backendOrigin = new URL(
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8001/api",
    window.location.origin,
  ).origin;

  return `${backendOrigin}/${storagePath}`;
};

const loadLogo = async (
  business: Business,
): Promise<string | null> => {
  const url = getLogoUrl(business);

  if (!url) return null;

  return new Promise((resolve) => {
    const image = new Image();

    image.crossOrigin = "anonymous";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");

        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0);

        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        console.error("Unable to convert business logo for PDF:", error);
        resolve(null);
      }
    };

    image.onerror = (error) => {
      console.error("Unable to load business logo:", url, error);
      resolve(null);
    };

    image.src = url;
  });
};

const addLogo = (
  doc: jsPDF,
  logo: string | null,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) => {
  if (!logo) return;

  try {
    const dimensions = doc.getImageProperties(logo);

    const ratio = Math.min(
      maxWidth / dimensions.width,
      maxHeight / dimensions.height,
    );

    doc.addImage(
      logo,
      "PNG",
      x,
      y,
      dimensions.width * ratio,
      dimensions.height * ratio,
      undefined,
      "FAST",
    );
  } catch (error) {
    console.error("Unable to add business logo to PDF:", error);
  }
};

const addPageHeading = (
  doc: jsPDF,
  quotation: Quotation,
) => {
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229);

  doc.text(
    `Quotation ${quotation.quotation_number}`,
    MARGIN,
    11,
  );
};

const addFooter = (doc: jsPDF) => {
  const totalPages = doc.getNumberOfPages();

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, 284, PAGE_WIDTH - MARGIN, 284);

    doc.setFont(FONT_NAME, "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 145);

    doc.text(
      "This is a quotation, not a tax invoice.",
      MARGIN,
      290,
    );

    doc.text(
      `Page ${page} of ${totalPages}`,
      PAGE_WIDTH - MARGIN,
      290,
      { align: "right" },
    );
  }
};

const ensureSpace = (
  doc: jsPDF,
  currentY: number,
  requiredHeight: number,
) => {
  if (currentY + requiredHeight <= BOTTOM_LIMIT) {
    return currentY;
  }

  doc.addPage();

  return 20;
};

const addTextSection = (
  doc: jsPDF,
  heading: string,
  content: string,
  startY: number,
) => {
  let y = startY;

  const lines = doc.splitTextToSize(content, CONTENT_WIDTH);

  y = ensureSpace(doc, y, 18);

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(10);
  doc.setTextColor(35, 45, 65);

  doc.text(heading, MARGIN, y);

  y += 7;

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(9);
  doc.setTextColor(85, 95, 110);

  for (const line of lines) {
    y = ensureSpace(doc, y, 6);

    doc.text(line, MARGIN, y);
    y += 5;
  }

  return y + 5;
};

const getItemTaxBreakup = (item: Quotation["items"][number]) => {
  const cgst = amount(item.cgst_amount);
  const sgst = amount(item.sgst_amount);
  const igst = amount(item.igst_amount);

  if (igst > 0) {
    return `IGST: ${igst.toFixed(2)}`;
  }

  if (cgst > 0 || sgst > 0) {
    return [
      `CGST: ${cgst.toFixed(2)}`,
      `SGST: ${sgst.toFixed(2)}`,
    ].join("\n");
  }

  return money(item.tax_amount);
};

const getItemTaxableAmount = (item: Quotation["items"][number]) => {
  const lineTotal = amount(item.line_total);
  const taxAmount = amount(item.tax_amount);

  // Backend line_total includes GST, so subtract saved GST to get taxable value.
  if (item.tax_amount !== null && item.tax_amount !== undefined) {
    return lineTotal - taxAmount;
  }

  return (
    amount(item.quantity) * amount(item.unit_price) -
    amount(item.discount)
  );
};

const createQuotationPdf = async (
  quotation: Quotation,
  business: Business | null,
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await registerFonts(doc);

  const currency = quotation.currency || business?.currency || "INR";
  const logo = business ? await loadLogo(business) : null;

  const cgstAmount = amount(quotation.cgst_amount);
  const sgstAmount = amount(quotation.sgst_amount);
  const igstAmount = amount(quotation.igst_amount);
  const totalTax = amount(quotation.tax_amount);

  const isInterState =
    igstAmount > 0 ||
    quotation.tax_type?.toLowerCase().includes("inter") ||
    quotation.tax_type?.toLowerCase().includes("igst");

  const hasGstBreakup =
    quotation.cgst_amount !== null &&
    quotation.cgst_amount !== undefined &&
    quotation.sgst_amount !== null &&
    quotation.sgst_amount !== undefined &&
    quotation.igst_amount !== null &&
    quotation.igst_amount !== undefined;

  doc.setProperties({
    title: `Quotation ${quotation.quotation_number}`,
    subject: "Quotation",
    creator: business?.name || "InvoiceCraft",
  });

  // Brand header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_WIDTH, 3, "F");

  addLogo(doc, logo, MARGIN, 12, 27, 25);

  const businessX = logo ? 46 : MARGIN;
  const businessWidth = 95;

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(15);
  doc.setTextColor(25, 35, 55);

  doc.text(
    business?.name || "Business Name",
    businessX,
    19,
    { maxWidth: businessWidth },
  );

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 100, 115);

  const businessDetails = [
    business?.address,
    [
      business?.city,
      business?.state,
      business?.postal_code,
    ].filter(Boolean).join(", "),
    business?.country,
    business?.phone,
    business?.email,
    business?.gstin ? `GSTIN: ${business.gstin}` : null,
  ].filter(Boolean) as string[];

  let businessY = 25;

  businessDetails.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, businessWidth);

    doc.text(wrapped, businessX, businessY);

    businessY += wrapped.length * 4;
  });

  // Quotation heading
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229);

  doc.text(
    "QUOTATION",
    PAGE_WIDTH - MARGIN,
    19,
    { align: "right" },
  );

  doc.setFontSize(10);
  doc.setTextColor(45, 55, 75);

  doc.text(
    quotation.quotation_number,
    PAGE_WIDTH - MARGIN,
    27,
    { align: "right" },
  );

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 120, 135);

  doc.text(
    formatStatus(quotation.status),
    PAGE_WIDTH - MARGIN,
    33,
    { align: "right" },
  );

  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 48, PAGE_WIDTH - MARGIN, 48);

  // Customer and quotation information
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(9);
  doc.setTextColor(110, 120, 135);

  doc.text("PREPARED FOR", MARGIN, 58);
  doc.text("QUOTATION DETAILS", 125, 58);

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 40, 60);

  const customerName = doc.splitTextToSize(
    quotation.customer_name || "Customer",
    95,
  );

  doc.text(customerName, MARGIN, 66);

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(85, 95, 110);

  let customerY = 66 + customerName.length * 5 + 2;

  const customerDetails = [
    quotation.customer_email,
    quotation.customer_phone,
    quotation.billing_address,
    quotation.customer_gstin
      ? `GSTIN: ${quotation.customer_gstin}`
      : null,
  ].filter(Boolean) as string[];

  customerDetails.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 95);

    doc.text(wrapped, MARGIN, customerY);

    customerY += wrapped.length * 4;
  });

  const quotationDetails = [
    ["Quotation Number", quotation.quotation_number],
    ["Quotation Date", formatDate(quotation.quotation_date)],
    ["Valid Until", formatDate(quotation.valid_until)],
    ["Status", formatStatus(quotation.status)],
    [
      "Place of Supply",
      quotation.place_of_supply_state
        ? `${quotation.place_of_supply_state}${
            quotation.place_of_supply_state_code
              ? ` (${quotation.place_of_supply_state_code})`
              : ""
          }`
        : "—",
    ],
    ["GST Treatment", formatTaxType(quotation.tax_type)],
  ];

  let detailsY = 66;

  quotationDetails.forEach(([label, value]) => {
    doc.setFont(FONT_NAME, "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 135);

    doc.text(label, 125, detailsY);

    doc.setFont(FONT_NAME, "bold");
    doc.setTextColor(45, 55, 75);

    doc.text(
      value,
      PAGE_WIDTH - MARGIN,
      detailsY,
      { align: "right", maxWidth: 65 },
    );

    detailsY += 7;
  });

  // Items table
  const tableStartY = Math.max(customerY, detailsY) + 9;

  autoTable(doc, {
    startY: tableStartY,
    margin: {
      left: MARGIN,
      right: MARGIN,
      bottom: 20,
      top: 18,
    },
    head: [[
      "Description",
      "Qty",
      "Unit Price",
      "Discount",
      "Taxable",
      "GST Breakup",
      "Amount",
    ]],
    body: quotation.items?.length
      ? quotation.items.map((item) => [
          item.description || "—",
          `${Number(item.quantity)} ${item.unit || ""}`.trim(),
          money(item.unit_price, currency),
          money(item.discount, currency),
          money(getItemTaxableAmount(item), currency),
          getItemTaxBreakup(item),
          money(item.line_total, currency),
        ])
      : [["No items", "", "", "", "", "", ""]],
    theme: "grid",
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      font: FONT_NAME,
      fontStyle: "bold",
      fontSize: 7,
    },
    bodyStyles: {
      font: FONT_NAME,
      fontStyle: "normal",
      fontSize: 7,
      textColor: [55, 65, 85],
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      font: FONT_NAME,
      overflow: "linebreak",
      cellPadding: 2.5,
      lineColor: [230, 233, 240],
      lineWidth: 0.2,
      valign: "middle",
    },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 34, halign: "left" },
      6: { cellWidth: "auto", halign: "right" },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addPageHeading(doc, quotation);
      }
    },
  });

  let y = (doc as PdfDocument).lastAutoTable.finalY + 10;

  // GST totals
  const totals: [string, string][] = [
    ["Subtotal", money(quotation.subtotal, currency)],
    ["Total discount", `- ${money(quotation.discount, currency)}`],
  ];

  if (hasGstBreakup) {
    if (isInterState) {
      totals.push(["IGST", money(igstAmount, currency)]);
    } else {
      totals.push(["CGST", money(cgstAmount, currency)]);
      totals.push(["SGST", money(sgstAmount, currency)]);
    }

    totals.push(["Total GST", money(totalTax, currency)]);
  } else {
    totals.push(["GST", money(totalTax, currency)]);
  }

  totals.push(["Grand total", money(quotation.total, currency)]);

  const totalsHeight = 9 + totals.length * 7;

  y = ensureSpace(doc, y, totalsHeight);

  const totalsX = 112;
  const totalsWidth = PAGE_WIDTH - MARGIN - totalsX;

  doc.setFillColor(248, 250, 252);

  doc.roundedRect(
    totalsX,
    y,
    totalsWidth,
    totalsHeight,
    2,
    2,
    "F",
  );

  y += 8;

  totals.forEach(([label, value]) => {
    const isTotal = label === "Grand total";
    const isGstTotal = label === "Total GST";

    doc.setFont(
      FONT_NAME,
      isTotal || isGstTotal ? "bold" : "normal",
    );

    doc.setFontSize(isTotal ? 10 : 8.5);

    if (isTotal) {
      doc.setTextColor(79, 70, 229);
    } else {
      doc.setTextColor(75, 85, 100);
    }

    doc.text(label, totalsX + 5, y);

    doc.text(
      value,
      PAGE_WIDTH - MARGIN - 5,
      y,
      { align: "right" },
    );

    if (isTotal) {
      doc.setDrawColor(220, 225, 235);

      doc.line(
        totalsX + 5,
        y + 3,
        PAGE_WIDTH - MARGIN - 5,
        y + 3,
      );
    }

    y += 7;
  });

  y += 10;

  // Notes
  if (quotation.notes?.trim()) {
    y = addTextSection(
      doc,
      "NOTES",
      quotation.notes.trim(),
      y,
    );
  }

  // Terms and conditions
  if (quotation.terms?.trim()) {
    y = addTextSection(
      doc,
      "TERMS AND CONDITIONS",
      quotation.terms.trim(),
      y,
    );
  }

  // Authorized signature
  y = ensureSpace(doc, y, 35);

  y += 10;

  doc.setDrawColor(170, 180, 195);

  doc.line(
    PAGE_WIDTH - 65,
    y,
    PAGE_WIDTH - MARGIN,
    y,
  );

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(65, 75, 90);

  doc.text(
    "Authorized Signature",
    PAGE_WIDTH - 40,
    y + 6,
    { align: "center" },
  );

  if (business?.name) {
    doc.setFont(FONT_NAME, "normal");
    doc.setFontSize(8);

    doc.text(
      `For ${business.name}`,
      PAGE_WIDTH - 40,
      y + 11,
      { align: "center" },
    );
  }

  addFooter(doc);

  return doc;
};

const getFilename = (quotation: Quotation) =>
  (quotation.quotation_number || "quotation")
    .replace(/[^a-zA-Z0-9_-]/g, "_");

export const downloadQuotationPdf = async (
  quotation: Quotation,
  business: Business | null,
) => {
  const doc = await createQuotationPdf(quotation, business);

  doc.save(`${getFilename(quotation)}.pdf`);
};

export const printQuotationPdf = async (
  quotation: Quotation,
  business: Business | null,
) => {
  // Open synchronously during the click event to avoid popup blocking.
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Please allow pop-ups to print the quotation.");
  }

  try {
    const doc = await createQuotationPdf(quotation, business);
    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };

    printWindow.location.href = blobUrl;

    // Keep the PDF URL alive while the browser loads the document.
    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);
  } catch (error) {
    printWindow.close();
    throw error;
  }
};