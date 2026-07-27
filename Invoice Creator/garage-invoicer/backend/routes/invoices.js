import { Router } from "express";
import { randomUUID } from "crypto";
import path from "path";
import db from "../db.js";
import { generateInvoicePdf } from "../pdf.js";
import { createSquarePaymentLink, hasSquareConfig } from "../square.js";
import { sendInvoiceEmail, hasEmailConfig } from "../email.js";

const router = Router();

function nextInvoiceNumber() {
  const count = db.prepare("SELECT COUNT(*) as n FROM invoices WHERE status = 'sent'").get().n;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

function computeTotals(lineItems, callOutPaid = false, callOutAmount = 0) {
  const subtotal = lineItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = callOutPaid ? Math.max(0, subtotal - callOutAmount) : subtotal;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    total:    Math.round(total    * 100) / 100,
  };
}

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM invoices ORDER BY created_at DESC").all();
  res.json(rows);
});

router.get("/config", (req, res) => {
  res.json({
    squareConfigured: hasSquareConfig,
    emailConfigured: hasEmailConfig(),
    defaultHourlyRate: Number(process.env.DEFAULT_HOURLY_RATE || 80),
    callOutFee: Number(process.env.CALL_OUT_FEE || 70),
    businessName: process.env.BUSINESS_NAME || "SL Works Ltd",
  });
});

// Create a draft — no invoice number or Square link yet
router.post("/", async (req, res) => {
  const { clientId, vehicleId, docType = "Invoice", lineItems, notes, sendViaSquare,
          callOutPaid = false, callOutAmount = 0 } = req.body;

  if (!clientId) return res.status(400).json({ error: "clientId is required" });
  if (!Array.isArray(lineItems) || lineItems.length === 0)
    return res.status(400).json({ error: "At least one line item is required" });

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const vehicle = vehicleId ? db.prepare("SELECT * FROM vehicles WHERE id = ?").get(vehicleId) : null;
  const { subtotal, total } = computeTotals(lineItems, callOutPaid, callOutAmount);
  const id = randomUUID();

  const pdfPath = await generateInvoicePdf({
    invoiceNumber: "DRAFT",
    docType,
    client,
    vehicle,
    lineItems,
    subtotal,
    total,
    notes,
    paymentUrl: null,
    isDraft: true,
    callOutPaid,
    callOutAmount,
  });

  db.prepare(
    `INSERT INTO invoices
      (id, client_id, vehicle_id, doc_type, status, line_items, subtotal, total, notes,
       square_requested, square_invoice_id, square_payment_url, pdf_path, callout_paid, callout_amount)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)`
  ).run(
    id, clientId, vehicleId || null, docType,
    JSON.stringify(lineItems), subtotal, total,
    notes || null, sendViaSquare ? 1 : 0, pdfPath,
    callOutPaid ? 1 : 0, callOutAmount
  );

  res.status(201).json({
    id,
    status: "draft",
    subtotal,
    total,
    pdfUrl: `/api/invoices/${id}/pdf`,
    clientEmail: client.email || null,
    clientName: client.name,
  });
});

// Send — assigns real number, creates Square link, regenerates PDF, emails
router.post("/:id/send", async (req, res) => {
  const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(invoice.client_id);
  const vehicle = invoice.vehicle_id
    ? db.prepare("SELECT * FROM vehicles WHERE id = ?").get(invoice.vehicle_id)
    : null;

  const invoiceNumber = nextInvoiceNumber();
  const lineItems = JSON.parse(invoice.line_items);

  // sendViaSquare can be sent in the request body (from the send-stage checkbox)
  const sendViaSquare = req.body?.sendViaSquare ?? Boolean(invoice.square_requested);

  // Create Square payment link now that we have the real invoice number
  let paymentUrl = null;
  let squareInvoiceId = null;
  if (sendViaSquare && hasSquareConfig) {
    try {
      const result = await createSquarePaymentLink({
        client,
        lineItems,
        invoiceNumber,
        notes: invoice.notes,
      });
      squareInvoiceId = result.squareInvoiceId;
      paymentUrl = result.paymentUrl;
    } catch (err) {
      console.error("Square failed:", err.message);
    }
  }

  // Generate final PDF with the real number and Square link (if any)
  const pdfPath = await generateInvoicePdf({
    invoiceNumber,
    docType: invoice.doc_type || "Invoice",
    client,
    vehicle,
    lineItems,
    subtotal: invoice.subtotal,
    total: invoice.total,
    notes: invoice.notes,
    paymentUrl,
    isDraft: false,
    callOutPaid:   Boolean(invoice.callout_paid),
    callOutAmount: invoice.callout_amount || 0,
  });

  // Email the PDF
  let emailSent = false;
  let emailError = null;
  if (client.email && hasEmailConfig()) {
    try {
      await sendInvoiceEmail({
        to: client.email,
        invoiceNumber,
        docType: invoice.doc_type || "Invoice",
        pdfPath,
        clientName: client.name,
        paymentUrl,
      });
      emailSent = true;
    } catch (err) {
      console.error("Email send failed:", err.message);
      emailError = err.message;
    }
  }

  db.prepare(
    `UPDATE invoices
     SET invoice_number = ?, status = 'sent', pdf_path = ?,
         square_invoice_id = ?, square_payment_url = ?
     WHERE id = ?`
  ).run(invoiceNumber, pdfPath, squareInvoiceId, paymentUrl, invoice.id);

  res.json({
    invoiceNumber,
    pdfUrl: `/api/invoices/${invoice.id}/pdf`,
    paymentUrl,
    emailSent,
    emailError: emailSent ? null : (emailError || (client.email ? "Email not configured" : "No client email on file")),
  });
});

router.get("/:id/pdf", (req, res) => {
  const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id);
  if (!invoice) return res.status(404).json({ error: "Invoice not found" });
  res.sendFile(path.resolve(invoice.pdf_path));
});

export default router;
