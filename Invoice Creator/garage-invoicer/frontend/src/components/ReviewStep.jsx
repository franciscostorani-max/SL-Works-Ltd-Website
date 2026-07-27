import { useState } from "react";
import { api } from "../api.js";

const gbp = (n) => `£${n.toFixed(2)}`;

export default function ReviewStep({
  client,
  lineItems,
  squareConfigured,
  emailConfigured,
  docType,
  onDocTypeChange,
  notes,
  onNotesChange,
  onGenerate,
  result,
  generating,
  errorMessage,
}) {
  const [callOutPaid, setCallOutPaid] = useState(false);
  const [sendViaSquare, setSendViaSquare] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sendError, setSendError] = useState("");

  const subtotal = Math.round(
    lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100
  ) / 100;

  // Sum of any line items flagged as call out fee
  const callOutTotal = Math.round(
    lineItems
      .filter((i) => i.isCallOut)
      .reduce((s, i) => s + i.quantity * i.unitPrice, 0) * 100
  ) / 100;

  const hasCallOut = callOutTotal > 0;
  const amountDue = callOutPaid ? Math.max(0, subtotal - callOutTotal) : subtotal;

  async function handleSendToClient() {
    setSending(true);
    setSendError("");
    try {
      const res = await api.sendInvoice(result.id, { sendViaSquare });
      setSendResult(res);
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  const isSent = Boolean(sendResult);
  const invoiceNumber = sendResult?.invoiceNumber;

  return (
    <div className="step-panel">
      <h2 className="step-title">03 — Review &amp; send</h2>

      <div className="toggle-row">
        <button
          className={docType === "Quote" ? "toggle-btn active" : "toggle-btn"}
          onClick={() => onDocTypeChange("Quote")}
        >
          Quote
        </button>
        <button
          className={docType === "Invoice" ? "toggle-btn active" : "toggle-btn"}
          onClick={() => onDocTypeChange("Invoice")}
        >
          Invoice
        </button>
      </div>

      <div className="ticket-block">
        {/* Show subtotal row only when call out is being deducted */}
        {callOutPaid && (
          <>
            <div className="totals-row">
              <span>Subtotal</span>
              <span className="mono">{gbp(subtotal)}</span>
            </div>
            <div className="totals-row">
              <span style={{ color: "var(--success)" }}>Call out fee (paid)</span>
              <span className="mono" style={{ color: "var(--success)" }}>-{gbp(callOutTotal)}</span>
            </div>
          </>
        )}
        <div className="totals-row totals-final">
          <span>Total due</span>
          <span className="mono">{gbp(amountDue)}</span>
        </div>
        <div className="totals-row">
          <span className="no-vat-note">No VAT — not registered</span>
        </div>
      </div>

      {/* Call out paid checkbox — only shows when a call out fee line item exists */}
      {hasCallOut && (
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={callOutPaid}
            onChange={(e) => setCallOutPaid(e.target.checked)}
          />
          <span>Call out fee already paid (paid as deposit — deduct from total)</span>
        </label>
      )}

      <textarea
        className="field textarea"
        placeholder="Notes for the client (optional)"
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
      />

      {errorMessage && <div className="error-text">{errorMessage}</div>}

      {/* Before generation */}
      {!result && (
        <button
          className="primary-btn full-width"
          disabled={generating || lineItems.length === 0}
          onClick={() => onGenerate({ callOutPaid, callOutAmount: callOutTotal })}
        >
          {generating ? "Generating…" : `Generate ${docType}`}
        </button>
      )}

      {/* After generation — draft stage */}
      {result && !isSent && (
        <div className="result-block">
          <div className="stamp draft-stamp">DRAFT</div>

          <a className="secondary-btn full-width" href={result.pdfUrl} target="_blank" rel="noreferrer">
            Open Draft PDF
          </a>

          {sendError && <div className="error-text">{sendError}</div>}

          <div className="send-panel">
            <div className="send-label">
              {client.email
                ? `Ready to send to ${client.email}`
                : <span className="warn-text">No email on file for {client.name} — invoice will be numbered but not emailed</span>
              }
            </div>
            {docType === "Invoice" && squareConfigured && (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={sendViaSquare}
                  onChange={(e) => setSendViaSquare(e.target.checked)}
                />
                <span>Add Square payment link to invoice</span>
              </label>
            )}
            <button
              className="primary-btn full-width"
              disabled={sending}
              onClick={handleSendToClient}
            >
              {sending ? "Sending…" : `Send ${docType} to Client`}
            </button>
          </div>
        </div>
      )}

      {/* After sending */}
      {isSent && (
        <div className="result-block">
          <div className="stamp">SENT</div>
          <div className="ticket-label">{invoiceNumber}</div>

          {sendResult.emailSent && (
            <div className="sent-note">
              ✓ Emailed to {client.email}
            </div>
          )}
          {sendResult.emailError && (
            <div className="error-text">{sendResult.emailError}</div>
          )}

          <a className="primary-btn full-width" href={sendResult.pdfUrl} target="_blank" rel="noreferrer">
            Open Invoice PDF
          </a>
        </div>
      )}
    </div>
  );
}
