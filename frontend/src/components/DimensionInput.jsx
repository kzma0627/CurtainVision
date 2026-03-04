import { useTranslation } from "react-i18next";

export default function DimensionInput({ width, height, onWidthChange, onHeightChange }) {
  const { t } = useTranslation();
  const inputStyle = { padding: "7px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 13, width: "100%", textAlign: "center", background: "#fff" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 11, color: "#8a7e6e", whiteSpace: "nowrap" }}>{t("order.widthLabel")}</label>
        <input type="number" min="0" step="1" placeholder="cm" value={width} onChange={(e) => onWidthChange(e.target.value)} style={{ ...inputStyle, width: 72 }} />
        <span style={{ fontSize: 11, color: "#8a7e6e" }}>cm</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 20 }}>
          <label style={{ fontSize: 11, color: "#8a7e6e" }}>{t("order.heightLabel")}</label>
          <input type="number" min="0" step="1" placeholder="cm" value={height} onChange={(e) => onHeightChange(e.target.value)} style={{ ...inputStyle, width: 64 }} />
          <span style={{ fontSize: 11, color: "#8a7e6e" }}>cm</span>
        </div>
        <svg width="140" height="170" viewBox="0 0 240 300" style={{ flexShrink: 0 }}>
          <rect x="0" y="0" width="240" height="240" fill="#f8f5ef" />
          <rect x="0" y="240" width="240" height="60" fill="#d4b896" />
          <line x1="0" y1="12" x2="240" y2="12" stroke="#d6cbb8" strokeWidth="1" />
          <line x1="30" y1="30" x2="210" y2="30" stroke="#5a4e3e" strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="30" r="5" fill="none" stroke="#5a4e3e" strokeWidth="2" />
          <circle cx="210" cy="30" r="5" fill="none" stroke="#5a4e3e" strokeWidth="2" />
          <rect x="55" y="50" width="130" height="130" rx="2" fill="none" stroke="#5a4e3e" strokeWidth="2" />
          <rect x="62" y="57" width="54" height="116" rx="1" fill="#dceef8" stroke="#b0a494" strokeWidth="0.8" />
          <rect x="124" y="57" width="54" height="116" rx="1" fill="#dceef8" stroke="#b0a494" strokeWidth="0.8" />
          <rect x="170" y="100" width="4" height="16" rx="2" fill="#b0a494" />
          <path d="M48 180 L50 186 L190 186 L192 180 Z" fill="#d6cbb8" stroke="#b0a494" strokeWidth="1" />
          <line x1="30" y1="16" x2="210" y2="16" stroke="#7a6344" strokeWidth="1" strokeDasharray="4 2" />
          <polygon points="33,16 38,13 38,19" fill="#7a6344" /><polygon points="207,16 202,13 202,19" fill="#7a6344" />
          <circle cx="120" cy="16" r="10" fill="#fff" stroke="#7a6344" strokeWidth="1" strokeDasharray="2 1" />
          <text x="120" y="20" textAnchor="middle" fontSize="11" fill="#7a6344" fontWeight="600">D</text>
          <line x1="42" y1="30" x2="42" y2="186" stroke="#7a6344" strokeWidth="1" strokeDasharray="4 2" />
          <polygon points="42,33 39,38 45,38" fill="#7a6344" /><polygon points="42,183 39,178 45,178" fill="#7a6344" />
          <circle cx="42" cy="108" r="10" fill="#fff" stroke="#7a6344" strokeWidth="1" strokeDasharray="2 1" />
          <text x="42" y="112" textAnchor="middle" fontSize="11" fill="#7a6344" fontWeight="600">B</text>
          <line x1="42" y1="186" x2="42" y2="280" stroke="#7a6344" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.4" />
        </svg>
      </div>
      <p style={{ fontSize: 10, color: "#b0a494", textAlign: "center" }}>{t("order.widthHelp")} &nbsp; {t("order.heightHelp")}</p>
    </div>
  );
}
