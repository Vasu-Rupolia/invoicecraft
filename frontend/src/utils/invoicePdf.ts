import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Business, Invoice } from "../types";

const PAGE_WIDTH = 210;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT_NAME = "NotoSans";

const money = (
  value: number | string | null | undefined,
  currency = "INR",
) => {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);
  } catch {
    return `${currency} ${(Number(value) || 0).toFixed(2)}`;
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
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
    {
      file: "NotoSans-Regular.ttf",
      style: "normal",
    },
    {
      file: "NotoSans-Bold.ttf",
      style: "bold",
    },
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
          console.error("Unable to create canvas context for logo.");
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

    doc.text("Thank you for your business.", MARGIN, 290);

    doc.text(
      `Page ${page} of ${totalPages}`,
      PAGE_WIDTH - MARGIN,
      290,
      { align: "right" },
    );
  }
};

const addTextSection = (
  doc: jsPDF,
  heading: string,
  content: string,
  startY: number,
) => {
  let y = startY;

  const lines = doc.splitTextToSize(content, CONTENT_WIDTH);
  const requiredHeight = 12 + lines.length * 5;

  if (y + requiredHeight > 278) {
    doc.addPage();
    y = 20;
  }

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(10);
  doc.setTextColor(35, 45, 65);
  doc.text(heading, MARGIN, y);

  y += 7;

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(9);
  doc.setTextColor(85, 95, 110);
  doc.text(lines, MARGIN, y);

  return y + lines.length * 5 + 8;
};

const createInvoicePdf = async (
  invoice: Invoice,
  business: Business | null,
) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await registerFonts(doc);

  const currency = invoice.currency || business?.currency || "INR";
  const logo = business ? await loadLogo(business) : null;

  const isIntraState = invoice.tax_type === "cgst_sgst";
  const isInterState = invoice.tax_type === "igst";

  const cgstAmount = Number(invoice.cgst_amount ?? 0);
  const sgstAmount = Number(invoice.sgst_amount ?? 0);
  const igstAmount = Number(invoice.igst_amount ?? 0);

  const placeOfSupply = [
    invoice.place_of_supply_state,
    invoice.place_of_supply_state_code
      ? `(${invoice.place_of_supply_state_code})`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const gstTreatment = isIntraState
    ? "CGST + SGST"
    : isInterState
      ? "IGST"
      : "GST breakup unavailable";

  // Brand header
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, PAGE_WIDTH, 3, "F");

  addLogo(doc, logo, MARGIN, 12, 27, 25);

  const businessX = logo ? 46 : MARGIN;

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(15);
  doc.setTextColor(25, 35, 55);

  doc.text(
    business?.name || "Business Name",
    businessX,
    19,
    { maxWidth: 95 },
  );

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(8);
  doc.setTextColor(90, 100, 115);

  const businessDetails = [
    business?.address,
    [business?.city, business?.state, business?.postal_code]
      .filter(Boolean)
      .join(", "),
    business?.country,
    business?.phone,
    business?.email,
    business?.gstin ? `GSTIN: ${business.gstin}` : null,
  ].filter(Boolean) as string[];

  let businessY = 25;

  businessDetails.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 95);
    doc.text(wrapped, businessX, businessY);
    businessY += wrapped.length * 4;
  });

  // Invoice heading
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(23);
  doc.setTextColor(79, 70, 229);

  doc.text("INVOICE", PAGE_WIDTH - MARGIN, 19, {
    align: "right",
  });

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(10);
  doc.setTextColor(45, 55, 75);

  doc.text(invoice.invoice_number, PAGE_WIDTH - MARGIN, 27, {
    align: "right",
  });

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 120, 135);

  doc.text(
    invoice.status.replaceAll("_", " ").toUpperCase(),
    PAGE_WIDTH - MARGIN,
    33,
    { align: "right" },
  );

  doc.setDrawColor(220, 225, 235);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 48, PAGE_WIDTH - MARGIN, 48);

  // Customer and invoice information
  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(9);
  doc.setTextColor(110, 120, 135);

  doc.text("BILLED TO", MARGIN, 58);
  doc.text("INVOICE DETAILS", 125, 58);

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 40, 60);

  doc.text(invoice.customer_name || "Customer", MARGIN, 66, {
    maxWidth: 95,
  });

  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(85, 95, 110);

  let customerY = 73;

  const customerDetails = [
    invoice.customer_email,
    invoice.customer_phone,
    invoice.billing_address,
    invoice.customer_gstin
      ? `GSTIN: ${invoice.customer_gstin}`
      : null,
  ].filter(Boolean) as string[];

  customerDetails.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 95);
    doc.text(wrapped, MARGIN, customerY);
    customerY += wrapped.length * 4;
  });

  const invoiceDetails: [string, string][] = [
    ["Invoice Number", invoice.invoice_number],
    ["Invoice Date", formatDate(invoice.invoice_date)],
    ["Due Date", formatDate(invoice.due_date)],
    ["Status", invoice.status.replaceAll("_", " ").toUpperCase()],
    ["Place of Supply", placeOfSupply || "—"],
    ["GST Treatment", gstTreatment],
  ];

  let detailsY = 66;

  invoiceDetails.forEach(([label, value]) => {
    doc.setFont(FONT_NAME, "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 135);

    doc.text(label, 125, detailsY);

    doc.setFont(FONT_NAME, "bold");
    doc.setTextColor(45, 55, 75);

    doc.text(value, PAGE_WIDTH - MARGIN, detailsY, {
      align: "right",
    });

    detailsY += 7;
  });

  // Items table with GST breakup
  const tableStartY = Math.max(customerY, detailsY) + 9;

  autoTable(doc, {
    startY: tableStartY,
    margin: {
      left: MARGIN,
      right: MARGIN,
      bottom: 20,
      top: 18,
    },
    head: [
      [
        "Description",
        "Qty",
        "Unit Price",
        "Discount",
        "Taxable",
        "GST Breakup",
        "Amount",
      ],
    ],
    body: (invoice.items || []).map((item) => {
      const itemTax = Number(item.tax_amount ?? 0);

      const taxableValue = Math.max(
        0,
        Number(item.line_total ?? 0) - itemTax,
      );

      const itemCgst = Number(item.cgst_amount ?? 0);
      const itemSgst = Number(item.sgst_amount ?? 0);
      const itemIgst = Number(item.igst_amount ?? 0);

      let gstBreakup = `${Number(item.tax_rate)}%\n`;

      if (isIntraState) {
        gstBreakup +=
          `CGST: ${money(itemCgst, currency)}\n` +
          `SGST: ${money(itemSgst, currency)}`;
      } else if (isInterState) {
        gstBreakup += `IGST: ${money(itemIgst, currency)}`;
      } else {
        gstBreakup += money(itemTax, currency);
      }

      return [
        item.description || "—",
        `${Number(item.quantity)} ${item.unit || ""}`,
        money(item.unit_price, currency),
        money(item.discount, currency),
        money(taxableValue, currency),
        gstBreakup,
        money(item.line_total, currency),
      ];
    }),
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
      valign: "middle",
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
    },
    columnStyles: {
      0: { cellWidth: 36 },
      1: { cellWidth: 15, halign: "right" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 37, halign: "left" },
      6: { cellWidth: "auto", halign: "right" },
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont(FONT_NAME, "bold");
        doc.setFontSize(9);
        doc.setTextColor(79, 70, 229);

        doc.text(
          `Invoice ${invoice.invoice_number}`,
          MARGIN,
          11,
        );
      }
    },
  });

  let y =
    (
      doc as jsPDF & {
        lastAutoTable: { finalY: number };
      }
    ).lastAutoTable.finalY + 10;

  // Invoice totals
  const totals: [string, string][] = [
    ["Subtotal", money(invoice.subtotal, currency)],
    ["Total discount", `- ${money(invoice.discount, currency)}`],
    [
      "Taxable amount",
      money(
        Number(invoice.subtotal ?? 0) - Number(invoice.discount ?? 0),
        currency,
      ),
    ],
  ];

  if (isIntraState) {
    totals.push(
      ["CGST", money(cgstAmount, currency)],
      ["SGST", money(sgstAmount, currency)],
    );
  }

  if (isInterState) {
    totals.push(["IGST", money(igstAmount, currency)]);
  }

  totals.push(
    ["Total GST", money(invoice.tax_amount, currency)],
    ["Total", money(invoice.total, currency)],
    ["Amount paid", money(invoice.amount_paid, currency)],
    ["Balance due", money(invoice.balance_due, currency)],
  );

  const totalsHeight = 13 + totals.length * 7;

  if (y + totalsHeight > 276) {
    doc.addPage();
    y = 20;
  }

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

  y += 9;

  totals.forEach(([label, value]) => {
    const isTotal = label === "Total";
    const isBalance = label === "Balance due";

    doc.setFont(
      FONT_NAME,
      isTotal || isBalance ? "bold" : "normal",
    );

    doc.setFontSize(isTotal ? 10 : 8.5);

    if (isTotal) {
      doc.setTextColor(79, 70, 229);
    } else if (isBalance) {
      doc.setTextColor(190, 45, 55);
    } else {
      doc.setTextColor(75, 85, 100);
    }

    doc.text(label, totalsX + 5, y);

    doc.text(value, PAGE_WIDTH - MARGIN - 5, y, {
      align: "right",
    });

    if (isTotal) {
      doc.setDrawColor(220, 225, 235);
      doc.line(
        totalsX + 5,
        y + 3,
        PAGE_WIDTH - MARGIN - 5,
        y + 3,
      );
      y += 5;
    }

    y += 7;
  });

  y += 8;

  // Payment history
  if (invoice.payments?.length) {
    if (y + 25 > 276) {
      doc.addPage();
      y = 20;
    }

    doc.setFont(FONT_NAME, "bold");
    doc.setFontSize(10);
    doc.setTextColor(35, 45, 65);
    doc.text("PAYMENT HISTORY", MARGIN, y);

    autoTable(doc, {
      startY: y + 4,
      margin: {
        left: MARGIN,
        right: MARGIN,
        bottom: 20,
      },
      head: [["Payment Date", "Payment Method", "Amount"]],
      body: invoice.payments.map((payment) => [
        formatDate(payment.payment_date),
        payment.payment_method.replaceAll("_", " "),
        money(payment.amount, currency),
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [55, 65, 85],
        font: FONT_NAME,
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        font: FONT_NAME,
        fontSize: 8,
        textColor: [55, 65, 85],
      },
      styles: {
        font: FONT_NAME,
        lineColor: [230, 233, 240],
        lineWidth: 0.2,
      },
    });

    y =
      (
        doc as jsPDF & {
          lastAutoTable: { finalY: number };
        }
      ).lastAutoTable.finalY + 10;
  }

  // Notes and terms
  if (invoice.notes) {
    y = addTextSection(doc, "NOTES", invoice.notes, y);
  }

  if (invoice.terms) {
    y = addTextSection(
      doc,
      "TERMS AND CONDITIONS",
      invoice.terms,
      y,
    );
  }

  // Signature
  if (y + 25 > 276) {
    doc.addPage();
    y = 20;
  }

  y += 10;

  doc.setDrawColor(170, 180, 195);
  doc.line(PAGE_WIDTH - 65, y, PAGE_WIDTH - MARGIN, y);

  doc.setFont(FONT_NAME, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(65, 75, 90);

  doc.text("Authorized Signature", PAGE_WIDTH - 40, y + 6, {
    align: "center",
  });

  if (business?.name) {
    doc.setFont(FONT_NAME, "normal");
    doc.setFontSize(8);

    doc.text(`For ${business.name}`, PAGE_WIDTH - 40, y + 11, {
      align: "center",
    });
  }

  addFooter(doc);

  return doc;
};

export const downloadInvoicePdf = async (
  invoice: Invoice,
  business: Business | null,
) => {
  const doc = await createInvoicePdf(invoice, business);

  const filename = `${invoice.invoice_number || "invoice"}`
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  doc.save(`${filename}.pdf`);
};

export const printInvoicePdf = async (
  invoice: Invoice,
  business: Business | null,
) => {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Please allow pop-ups to print the invoice.");
  }

  try {
    const doc = await createInvoicePdf(invoice, business);
    const blobUrl = URL.createObjectURL(doc.output("blob"));

    printWindow.location.href = blobUrl;

    printWindow.onload = () => {
      printWindow.print();
    };
  } catch (error) {
    printWindow.close();
    throw error;
  }
};

export const generateInvoicePdfBlob = async (
  invoice: Invoice,
  business: Business | null,
): Promise<Blob> => {
  const doc = await createInvoicePdf(invoice, business);

  return doc.output("blob");
};