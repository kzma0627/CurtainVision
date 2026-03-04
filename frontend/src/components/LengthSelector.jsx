import { useTranslation } from "react-i18next";

export default function LengthSelector({ value, onChange }) {
  const { t } = useTranslation();
  const options = [
    { id: "floor", labelKey: "length.floor" },
    { id: "windowsill", labelKey: "length.windowsill" },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{
            flex: 1, padding: "8px 6px", borderRadius: 12,
            background: active ? "rgba(122,99,68,0.08)" : "rgba(255,255,255,0.8)",
            border: active ? "2px solid #7a6344" : "1px solid #d6cbb8",
            transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <svg width="52" height="64" viewBox="0 0 80 96">
              <line x1="10" y1="8" x2="70" y2="8" stroke="#7a6344" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="10" cy="8" r="3" fill="#7a6344" /><circle cx="70" cy="8" r="3" fill="#7a6344" />
              <rect x="20" y="16" width="40" height="40" rx="2" fill="#e8f4fd" stroke="#b0a494" strokeWidth="1" />
              <line x1="16" y1="56" x2="64" y2="56" stroke="#b0a494" strokeWidth="2" />
              <line x1="5" y1="88" x2="75" y2="88" stroke="#c0b49e" strokeWidth="1.5" strokeDasharray="4 2" />
              {opt.id === "floor" ? (
                <>
                  <rect x="18" y="10" width="18" height="76" rx="2" fill="rgba(122,99,68,0.12)" />
                  <rect x="44" y="10" width="18" height="76" rx="2" fill="rgba(122,99,68,0.12)" />
                </>
              ) : (
                <>
                  <rect x="18" y="10" width="18" height="44" rx="2" fill="rgba(122,99,68,0.12)" />
                  <rect x="44" y="10" width="18" height="44" rx="2" fill="rgba(122,99,68,0.12)" />
                </>
              )}
            </svg>
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? "#3a3022" : "#7a6e5e" }}>{t(opt.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
