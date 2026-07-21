import { useState } from "react";

const gbp = (n) => `£${n.toFixed(2)}`;

let localId = 0;
function nextId() {
  localId += 1;
  return `line-${localId}`;
}

export default function LineItemEditor({ lineItems, onChange, defaultHourlyRate, callOutFee }) {
  const [draft, setDraft] = useState({ description: "", quantity: 1, unitPrice: defaultHourlyRate });

  function addItem() {
    if (!draft.description.trim()) return;
    onChange([
      ...lineItems,
      {
        id: nextId(),
        description: draft.description.trim(),
        quantity: Number(draft.quantity) || 1,
        unitPrice: Number(draft.unitPrice) || 0,
      },
    ]);
    setDraft({ description: "", quantity: 1, unitPrice: defaultHourlyRate });
  }

  function addCallOutPreset() {
    onChange([
      ...lineItems,
      {
        id: nextId(),
        description: "Call out fee",
        quantity: 1,
        unitPrice: callOutFee,
      },
    ]);
  }

  function addLabourPreset(hours) {
    onChange([
      ...lineItems,
      {
        id: nextId(),
        description: `Labour (${hours}h)`,
        quantity: hours,
        unitPrice: defaultHourlyRate,
      },
    ]);
  }

  function removeItem(id) {
    onChange(lineItems.filter((item) => item.id !== id));
  }

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div className="step-panel">
      <h2 className="step-title">02 — Line items</h2>

      <div className="preset-row">
        <button className="chip-btn-callout" onClick={addCallOutPreset}>
          + Call out £{callOutFee}
        </button>
      </div>
      <div className="preset-row">
        <span className="preset-label">Quick add labour:</span>
        {[0.5, 1, 2, 4].map((h) => (
          <button key={h} className="chip-btn" onClick={() => addLabourPreset(h)}>
            {h}h
          </button>
        ))}
      </div>

      {lineItems.length > 0 && (
        <div className="line-item-list">
          {lineItems.map((item) => (
            <div className="line-item-row" key={item.id}>
              <div className="line-item-desc">
                <div>{item.description}</div>
                <div className="client-meta">
                  {item.quantity} × {gbp(item.unitPrice)}
                </div>
              </div>
              <div className="line-item-amount mono">{gbp(item.quantity * item.unitPrice)}</div>
              <button className="remove-btn" onClick={() => removeItem(item.id)} aria-label="Remove line">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="new-line-form">
        <input
          className="field"
          placeholder="Description (e.g. Dell'Orto carb rebuild)"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <div className="field-row">
          <input
            className="field field-small"
            type="number"
            step="0.25"
            placeholder="Qty"
            value={draft.quantity}
            onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
          />
          <input
            className="field field-small"
            type="number"
            step="0.01"
            placeholder="Unit price £"
            value={draft.unitPrice}
            onChange={(e) => setDraft({ ...draft, unitPrice: e.target.value })}
          />
          <button className="secondary-btn field-small" onClick={addItem}>
            Add
          </button>
        </div>
      </div>

      {lineItems.length > 0 && (
        <div className="subtotal-preview mono">Subtotal: {gbp(subtotal)}</div>
      )}
    </div>
  );
}
