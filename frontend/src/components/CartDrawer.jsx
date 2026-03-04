import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCart } from "../contexts/CartContext";
import { API_BASE } from "../data/fabrics";
import { CURRENCY } from "../utils/pricing";
import { submitCheckout } from "../utils/api";

export default function CartDrawer({ open, onClose }) {
  const { t } = useTranslation();
  const { items, removeItem, clearCart, totalEstimate } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmitAll = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await submitCheckout(items);
      setSubmitted(true);
      setTimeout(() => {
        clearCart();
        setSubmitted(false);
        onClose();
      }, 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
          zIndex: 999, transition: "opacity 0.2s",
        }}
      />
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: Math.min(400, window.innerWidth), background: "#faf7f2",
        zIndex: 1000, boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
        animation: "fadeUp 0.2s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #e4dacb",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#3a3022" }}>
            {t("cart.title")} {items.length > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: "#8a7e6e" }}>({t("cart.items", { count: items.length })})</span>}
          </h3>
          <button onClick={onClose} style={{ fontSize: 20, color: "#b0a494", padding: "4px 8px" }}>&times;</button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {items.length === 0 ? (
            <p style={{ textAlign: "center", color: "#b0a494", fontSize: 13, marginTop: 60 }}>{t("cart.empty")}</p>
          ) : (
            items.map((item) => (
              <div key={item.id} style={{
                display: "flex", gap: 10, padding: "10px 0",
                borderBottom: "1px solid #eae4d8",
              }}>
                {/* Thumbnail */}
                <div style={{ width: 64, height: 48, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#e8e2d8" }}>
                  {item.resultUrl ? (
                    <img src={item.resultUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : item.style?.thumbnail ? (
                    <img src={API_BASE + item.style.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#3a3022", marginBottom: 2 }}>
                    {item.style?.categoryName || item.style?.id}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a7e6e" }}>
                    {item.dimensions?.width && item.dimensions?.height
                      ? `${item.dimensions.width}×${item.dimensions.height}cm`
                      : ""}{" "}
                    × {item.quantity || 1}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#7a6344", marginTop: 2 }}>
                    {CURRENCY} {item.pricing?.totalPrice?.toLocaleString() || "—"}
                  </div>
                </div>
                {/* Remove */}
                <button
                  onClick={() => removeItem(item.id)}
                  style={{ fontSize: 11, color: "#c0392b", padding: "4px 8px", alignSelf: "flex-start" }}
                >
                  {t("cart.remove")}
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #e4dacb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 14, fontWeight: 700, color: "#3a3022" }}>
              <span>{t("cart.total")}</span>
              <span>{CURRENCY} {totalEstimate.toLocaleString()}</span>
            </div>

            {error && (
              <div style={{ marginBottom: 8, padding: "6px 8px", borderRadius: 6, background: "#fff5f5", border: "1px solid #f5c2c0", color: "#b1261a", fontSize: 11 }}>{error}</div>
            )}
            {submitted && (
              <div style={{ marginBottom: 8, padding: "6px 8px", borderRadius: 6, background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", fontSize: 11 }}>{t("order.submitted")}</div>
            )}

            <button
              onClick={handleSubmitAll}
              disabled={submitting}
              style={{
                width: "100%", padding: "10px 24px", borderRadius: 22, border: "none",
                background: "linear-gradient(135deg, #7a6344, #9e8564)",
                color: "#fff", fontSize: 13, fontWeight: 600,
                boxShadow: "0 3px 12px rgba(122,99,68,0.25)",
                opacity: submitting ? 0.7 : 1,
                marginBottom: 8,
              }}
            >
              {submitting ? t("order.submitting") : t("cart.submitAll")}
            </button>
            <button
              onClick={onClose}
              style={{
                width: "100%", padding: "10px 24px", borderRadius: 22,
                border: "1.5px solid #7a6344", background: "transparent",
                color: "#7a6344", fontSize: 13, fontWeight: 600,
              }}
            >
              {t("cart.continue")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
