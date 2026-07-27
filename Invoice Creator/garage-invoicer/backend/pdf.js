import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, "data");
const outDir = path.join(dataDir, "invoices");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const gbp = (n) => `£${n.toFixed(2)}`;

// Returns a Promise that resolves to filePath once the file is fully written
export function generateInvoicePdf({
  invoiceNumber,
  docType,
  client,
  vehicle,
  lineItems,
  subtotal,
  total,
  notes,
  paymentUrl,
  isDraft = false,
  callOutPaid = false,
  callOutAmount = 0,
}) {
  return new Promise((resolve, reject) => {
    const business = {
      name: process.env.BUSINESS_NAME || "SL Works Ltd",
      address: process.env.BUSINESS_ADDRESS || "",
      phone: process.env.BUSINESS_PHONE || "",
      email: process.env.BUSINESS_EMAIL || "",
    };

    const label = isDraft ? `${docType.toUpperCase()} — DRAFT` : `${docType.toUpperCase()} ${invoiceNumber}`;
    const filePath = path.join(outDir, `${invoiceNumber}.pdf`);

    const doc = new PDFDocument({ size: "A4", margin: 50, autoFirstPage: true, bufferPages: false });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);

    // ── Company header (left) ────────────────────────────────────────────────
    doc.fontSize(20).fillColor("#1c1c1e").text(business.name, 50, 50);

    const contactLine = [business.phone, business.email].filter(Boolean).join("  ·  ");
    doc.fontSize(9).fillColor("#555");
    if (business.address) doc.text(business.address, 50, 74);
    if (contactLine)      doc.text(contactLine, 50, business.address ? 86 : 74);
    doc.text("Not VAT registered", 50, business.address ? 98 : 86);

    // ── Invoice title + date (right) ─────────────────────────────────────────
    doc.fontSize(16).fillColor("#1c1c1e").text(label, 50, 50, { align: "right" });
    doc.fontSize(9).fillColor("#555").text(new Date().toLocaleDateString("en-GB"), 50, 72, { align: "right" });

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.moveTo(50, 122).lineTo(545, 122).strokeColor("#ddd").stroke();

    // ── Bill to ──────────────────────────────────────────────────────────────
    let y = 136;
    doc.fontSize(8).fillColor("#aaa").text("BILL TO", 50, y);
    y += 14;
    doc.fontSize(11).fillColor("#1c1c1e").text(client.name, 50, y);
    y += 16;
    doc.fontSize(10).fillColor("#555");
    if (client.email)   { doc.text(client.email,   50, y); y += 14; }
    if (client.phone)   { doc.text(client.phone,   50, y); y += 14; }
    if (client.address) { doc.text(client.address, 50, y); y += 14; }

    if (vehicle) {
      const vText = [vehicle.make, vehicle.model, vehicle.registration].filter(Boolean).join("  ·  ");
      doc.fontSize(9).fillColor("#888").text(`Vehicle: ${vText}`, 50, y);
      y += 14;
    }

    // ── Line items table ──────────────────────────────────────────────────────
    y += 16;
    const col = { desc: 50, qty: 330, rate: 395, amount: 470 };

    doc.fontSize(8).fillColor("#aaa");
    doc.text("DESCRIPTION", col.desc, y);
    doc.text("QTY",         col.qty,  y);
    doc.text("RATE",        col.rate, y);
    doc.text("AMOUNT",      col.amount, y);
    y += 14;
    doc.moveTo(50, y).lineTo(545, y).strokeColor("#ddd").stroke();
    y += 10;

    doc.fontSize(10).fillColor("#1c1c1e");
    lineItems.forEach((item) => {
      doc.text(item.description,                        col.desc,   y, { width: 270 });
      doc.text(String(item.quantity),                   col.qty,    y);
      doc.text(gbp(item.unitPrice),                     col.rate,   y);
      doc.text(gbp(item.quantity * item.unitPrice),     col.amount, y);
      y += 22;
    });

    doc.moveTo(50, y).lineTo(545, y).strokeColor("#ddd").stroke();
    y += 14;

    // ── Total ─────────────────────────────────────────────────────────────────
    if (callOutPaid) {
      // Show subtotal, then deduction, then amount due
      doc.fontSize(10).fillColor("#888");
      doc.text("Subtotal",          col.rate,   y, { lineBreak: false });
      doc.fillColor("#1c1c1e").text(gbp(subtotal), col.amount, y, { lineBreak: false });
      y += 16;
      doc.fontSize(10).fillColor("#888");
      doc.text("Call out fee (paid as deposit)", col.rate, y, { lineBreak: false });
      doc.fillColor("#555").text(`-${gbp(callOutAmount)}`, col.amount, y, { lineBreak: false });
      y += 10;
      doc.moveTo(col.rate, y).lineTo(545, y).strokeColor("#ddd").stroke();
      y += 10;
    }
    doc.fontSize(13).fillColor("#1c1c1e");
    doc.text("Total due", col.rate,   y);
    doc.text(gbp(total),  col.amount, y);
    y += 16;
    doc.fontSize(8).fillColor("#aaa").text("No VAT — SL Works Ltd is not VAT registered", col.rate, y);
    y += 28;

    // ── Notes ─────────────────────────────────────────────────────────────────
    if (notes) {
      doc.fontSize(8).fillColor("#aaa").text("NOTES", 50, y);
      y += 12;
      doc.fontSize(10).fillColor("#333").text(notes, 50, y, { width: 495 });
      y += 30;
    }

    // ── Payment details ───────────────────────────────────────────────────────
    doc.moveTo(50, y).lineTo(545, y).strokeColor("#eee").stroke();
    y += 14;

    doc.fontSize(8).fillColor("#aaa").text("PAYMENT DETAILS", 50, y);
    y += 14;
    doc.fontSize(9).fillColor("#555")
      .text("Please use your invoice number as the payment reference.", 50, y);
    y += 16;

    const bankDetails = [
      ["Account name", "SL Works Ltd"],
      ["Sort code",    "40-05-20"],
      ["Account no",  "32350939"],
      ["Reference",   invoiceNumber],
    ];
    bankDetails.forEach(([lbl, value]) => {
      doc.fontSize(10).fillColor("#888").text(lbl,   50,  y, { lineBreak: false });
      doc.fontSize(10).fillColor("#1c1c1e").text(value, 180, y, { lineBreak: false });
      y += 18;
    });

    if (paymentUrl) {
      y += 8;
      doc.fontSize(9).fillColor("#555").text("Or pay online:", 50, y);
      y += 14;
      doc.fontSize(9).fillColor("#1a56db").text(paymentUrl, 50, y, { link: paymentUrl, underline: true, width: 495 });
    }

    doc.end();
  });
}
