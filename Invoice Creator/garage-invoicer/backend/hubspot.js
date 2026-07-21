const BASE = "https://api.hubapi.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function fullName(props) {
  return [props.firstname, props.lastname].filter(Boolean).join(" ") || props.email || "Unknown";
}

function toClient(hs) {
  const p = hs.properties;
  const addressParts = [p.address, p.city, p.zip].filter(Boolean);
  return {
    hubspotId: hs.id,
    name: fullName(p),
    email: p.email || "",
    phone: p.phone || "",
    address: addressParts.join(", "),
  };
}

export async function searchHubSpotContacts(query) {
  const body = {
    filterGroups: [
      { filters: [{ propertyName: "firstname", operator: "CONTAINS_TOKEN", value: `${query}*` }] },
      { filters: [{ propertyName: "lastname",  operator: "CONTAINS_TOKEN", value: `${query}*` }] },
      { filters: [{ propertyName: "email",     operator: "CONTAINS_TOKEN", value: `${query}*` }] },
      { filters: [{ propertyName: "phone",     operator: "CONTAINS_TOKEN", value: `${query}*` }] },
    ],
    properties: ["firstname", "lastname", "email", "phone", "address", "city", "zip"],
    limit: 10,
  };

  const res = await fetch(`${BASE}/crm/v3/objects/contacts/search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return (data.results || []).map(toClient);
}
