import { API_BASE } from "../data/fabrics";

export async function fetchWindows() {
  const resp = await fetch(API_BASE + "/api/windows");
  const data = await resp.json();
  return data.windows || [];
}

export async function generateCurtain(formData, { token, guestUUID } = {}) {
  if (guestUUID) formData.append("guest_uuid", guestUUID);

  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const detail = typeof errData.detail === "string" ? errData.detail : errData.error;
    throw new Error(detail || `Server error (${resp.status})`);
  }

  const data = await resp.json();
  if (!data.success) throw new Error(data.error || "Generation failed");
  return { ...data, result_url: API_BASE + data.result_url };
}

export async function submitOrder(payload) {
  const resp = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const d = await resp.json().catch(() => ({}));
    throw new Error(d.detail || d.error || "Submission failed");
  }
  return resp.json();
}

export async function submitCheckout(items, { token } = {}) {
  const payload = {
    items: items.map((item) => ({
      windowPhoto: item.windowPhoto,
      photoLabel: item.photoLabel,
      style: item.style,
      config: {
        pleatMultiplier: item.pleatMultiplier,
        lengthType: item.lengthType,
        arrangement: item.arrangement,
        width: item.dimensions?.width,
        height: item.dimensions?.height,
        quantity: item.quantity,
        rollerType: item.rollerType,
        notes: item.notes,
      },
      pricing: item.pricing,
      resultUrl: item.resultUrl,
    })),
    createdAt: new Date().toISOString(),
  };

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error("Submission failed");
  return resp.json();
}
