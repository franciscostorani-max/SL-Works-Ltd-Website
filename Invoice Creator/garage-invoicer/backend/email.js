import nodemailer from "nodemailer";
import fs from "fs";

// Re-evaluated on every call so .env reloads are picked up
export function hasEmailConfig() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendInvoiceEmail({ to, invoiceNumber, docType, pdfPath, clientName, paymentUrl }) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  // SMTP_FROM lets you display a different address (e.g. info@slworks.co.uk) while
  // authenticating via the account that holds the App Password (SMTP_USER).
  const fromAddress = process.env.SMTP_FROM || smtpUser;
  const businessName = process.env.BUSINESS_NAME || "SL Works Ltd";

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const subject = `${docType} ${invoiceNumber} — ${businessName}`;
  const body = [
    `Dear ${clientName},`,
    "",
    `Please find your ${docType.toLowerCase()} ${invoiceNumber} attached.`,
    "",
    "Payment details:",
    `  Account name:  ${businessName}`,
    "  Sort code:     40-05-20",
    "  Account no:    32350939",
    `  Reference:     ${invoiceNumber}`,
    ...(paymentUrl ? ["", `Pay online: ${paymentUrl}`] : []),
    "",
    `Thank you for choosing ${businessName}.`,
    "",
    "Best regards,",
    businessName,
    fromAddress,
  ].join("\n");

  await transporter.sendMail({
    from: `${businessName} <${fromAddress}>`,
    to,
    subject,
    text: body,
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: fs.readFileSync(pdfPath),
        contentType: "application/pdf",
      },
    ],
  });
}
