import { useState, useEffect } from "react";
import { api } from "../api.js";

export default function ClientStep({ selectedClient, onSelectClient }) {
  const [query, setQuery] = useState("");
  const [localResults, setLocalResults] = useState([]);
  const [hubspotResults, setHubspotResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "", address: "" });
  const [vehicle, setVehicle] = useState({ make: "", model: "", registration: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (query.length < 2) {
      setLocalResults([]);
      setHubspotResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timeout = setTimeout(async () => {
      const [local, hs] = await Promise.allSettled([
        api.searchClients(query),
        api.searchHubSpot(query),
      ]);
      if (cancelled) return;
      setLocalResults(local.status === "fulfilled" ? local.value : []);
      setHubspotResults(hs.status === "fulfilled" ? hs.value : []);
      setSearching(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [query]);

  async function handleCreateClient() {
    setError("");
    if (!newClient.name.trim()) {
      setError("Client name is required");
      return;
    }
    try {
      const created = await api.createClient(newClient);
      let vehicleRecord = null;
      if (vehicle.make || vehicle.model || vehicle.registration) {
        vehicleRecord = await api.addVehicle(created.id, vehicle);
      }
      onSelectClient({ ...created, vehicle: vehicleRecord });
    } catch (err) {
      setError(err.message);
    }
  }

  // Select a HubSpot contact — pre-fill the new client form with their details
  function selectHubSpotContact(contact) {
    setNewClient({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
    });
    setShowNewForm(true);
    setQuery("");
    setHubspotResults([]);
    setLocalResults([]);
  }

  const hasResults = localResults.length > 0 || hubspotResults.length > 0;

  if (selectedClient) {
    return (
      <div className="ticket-block">
        <div className="ticket-label">Billing to</div>
        <div className="client-summary">
          <div className="client-name">{selectedClient.name}</div>
          {selectedClient.vehicle && (
            <div className="client-meta">
              {[selectedClient.vehicle.make, selectedClient.vehicle.model, selectedClient.vehicle.registration]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
          <button className="link-btn" onClick={() => onSelectClient(null)}>
            Change client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="step-panel">
      <h2 className="step-title">01 — Client</h2>

      {!showNewForm && (
        <>
          <input
            className="field"
            placeholder="Search clients or HubSpot contacts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {searching && <div className="client-meta" style={{ marginBottom: 8 }}>Searching…</div>}

          {hasResults && (
            <div className="result-list-wrap">
              {localResults.length > 0 && (
                <>
                  <div className="result-section-label">Previous clients</div>
                  <ul className="result-list">
                    {localResults.map((c) => (
                      <li key={c.id}>
                        <button className="result-row" onClick={() => onSelectClient(c)}>
                          <span className="client-name">{c.name}</span>
                          <span className="client-meta">{c.email || c.phone || ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {hubspotResults.length > 0 && (
                <>
                  <div className="result-section-label hubspot-label">HubSpot contacts</div>
                  <ul className="result-list">
                    {hubspotResults.map((c) => (
                      <li key={c.hubspotId}>
                        <button className="result-row" onClick={() => selectHubSpotContact(c)}>
                          <span className="client-name">{c.name}</span>
                          <span className="client-meta">{c.email || c.phone || ""}</span>
                          <span className="hs-badge">HubSpot</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <button className="secondary-btn" onClick={() => setShowNewForm(true)}>
            + New client
          </button>
        </>
      )}

      {showNewForm && (
        <div className="new-client-form">
          <input
            className="field"
            placeholder="Client name *"
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
          />
          <input
            className="field"
            placeholder="Email"
            value={newClient.email}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
          />
          <input
            className="field"
            placeholder="Phone"
            value={newClient.phone}
            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
          />
          <input
            className="field"
            placeholder="Address"
            value={newClient.address}
            onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
          />

          <div className="field-divider">Vehicle (optional)</div>
          <div className="field-row">
            <input
              className="field"
              placeholder="Make"
              value={vehicle.make}
              onChange={(e) => setVehicle({ ...vehicle, make: e.target.value })}
            />
            <input
              className="field"
              placeholder="Model"
              value={vehicle.model}
              onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
            />
          </div>
          <input
            className="field"
            placeholder="Registration"
            value={vehicle.registration}
            onChange={(e) => setVehicle({ ...vehicle, registration: e.target.value })}
          />

          {error && <div className="error-text">{error}</div>}

          <div className="form-actions">
            <button className="link-btn" onClick={() => { setShowNewForm(false); setNewClient({ name: "", email: "", phone: "", address: "" }); }}>
              Cancel
            </button>
            <button className="primary-btn" onClick={handleCreateClient}>
              Save client
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
