const base = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  getConfig: () => request("/invoices/config"),
  searchClients: (q) => request(`/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getClient: (id) => request(`/clients/${id}`),
  createClient: (data) =>
    request("/clients", { method: "POST", body: JSON.stringify(data) }),
  addVehicle: (clientId, data) =>
    request(`/clients/${clientId}/vehicles`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createInvoice: (data) =>
    request("/invoices", { method: "POST", body: JSON.stringify(data) }),
  searchHubSpot: (q) => request(`/hubspot/contacts?q=${encodeURIComponent(q)}`),
  sendInvoice: (id, data = {}) => request(`/invoices/${id}/send`, { method: "POST", body: JSON.stringify(data) }),
};
