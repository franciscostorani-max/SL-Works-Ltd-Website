import { useState, useEffect } from "react";
import { api } from "./api.js";
import ClientStep from "./components/ClientStep.jsx";
import LineItemEditor from "./components/LineItemEditor.jsx";
import ReviewStep from "./components/ReviewStep.jsx";

export default function App() {
  const [config, setConfig] = useState(null);
  const [client, setClient] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [docType, setDocType] = useState("Invoice");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    api.getConfig().then(setConfig).catch(() => {});
  }, []);

  async function handleGenerate({ callOutPaid = false, callOutAmount = 0 } = {}) {
    setGenerating(true);
    setErrorMessage("");
    setResult(null);
    try {
      const created = await api.createInvoice({
        clientId: client.id,
        vehicleId: client.vehicle?.id,
        docType,
        lineItems: lineItems.map(({ description, quantity, unitPrice }) => ({
          description,
          quantity,
          unitPrice,
        })),
        notes,
        callOutPaid,
        callOutAmount,
      });
      setResult(created);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function startNewJob() {
    setClient(null);
    setLineItems([]);
    setNotes("");
    setResult(null);
    setErrorMessage("");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <img src="/slworks-logo.png" alt="SL Works" className="app-logo" />
          <div className="app-title-block">
            <div className="app-title">SL Works Ltd</div>
            <div className="app-subtitle">Mobile Car Repairs · Invoicer</div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <ClientStep selectedClient={client} onSelectClient={setClient} />

        {client && (
          <LineItemEditor
            lineItems={lineItems}
            onChange={setLineItems}
            defaultHourlyRate={config?.defaultHourlyRate ?? 80}
            callOutFee={config?.callOutFee ?? 70}
          />
        )}

        {client && lineItems.length > 0 && (
          <ReviewStep
            client={client}
            lineItems={lineItems}
            squareConfigured={config?.squareConfigured ?? false}
            emailConfigured={config?.emailConfigured ?? false}
            docType={docType}
            onDocTypeChange={setDocType}
            notes={notes}
            onNotesChange={setNotes}
            onGenerate={handleGenerate}
            result={result}
            generating={generating}
            errorMessage={errorMessage}
          />
        )}

        {result && (
          <button className="link-btn new-job-btn" onClick={startNewJob}>
            + Start next job
          </button>
        )}
      </main>
    </div>
  );
}
