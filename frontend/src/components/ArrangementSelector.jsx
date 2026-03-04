import { useTranslation } from "react-i18next";
import { ARRANGEMENT_OPTIONS } from "../data/fabrics";

export default function ArrangementSelector({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {ARRANGEMENT_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{
            flex: 1, padding: "8px 6px", borderRadius: 10, fontSize: 12, fontWeight: active ? 600 : 400,
            background: active ? "linear-gradient(135deg, #7a6344, #9e8564)" : "rgba(255,255,255,0.8)",
            color: active ? "#fff" : "#6a5e4e",
            border: active ? "none" : "1px solid #d6cbb8",
            transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <svg width="40" height="32" viewBox="0 0 60 48">
              <line x1="5" y1="4" x2="55" y2="4" stroke={active ? "#fff" : "#7a6344"} strokeWidth="2" strokeLinecap="round" />
              {opt.id === "double" ? (
                <>
                  <rect x="8" y="6" width="20" height="38" rx="1" fill={active ? "rgba(255,255,255,0.25)" : "rgba(122,99,68,0.12)"} />
                  <rect x="32" y="6" width="20" height="38" rx="1" fill={active ? "rgba(255,255,255,0.25)" : "rgba(122,99,68,0.12)"} />
                  <line x1="30" y1="8" x2="30" y2="42" stroke={active ? "rgba(255,255,255,0.5)" : "rgba(122,99,68,0.3)"} strokeWidth="1" strokeDasharray="2 2" />
                </>
              ) : opt.id === "left" ? (
                <rect x="8" y="6" width="32" height="38" rx="1" fill={active ? "rgba(255,255,255,0.25)" : "rgba(122,99,68,0.12)"} />
              ) : (
                <rect x="20" y="6" width="32" height="38" rx="1" fill={active ? "rgba(255,255,255,0.25)" : "rgba(122,99,68,0.12)"} />
              )}
            </svg>
            <span style={{ fontSize: 11 }}>{t(opt.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
