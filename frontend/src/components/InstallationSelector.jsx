import { useTranslation } from "react-i18next";
import { INSTALLATION_OPTIONS } from "../data/fabrics";

export default function InstallationSelector({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {INSTALLATION_OPTIONS.map((opt) => {
        const active = value === opt.id;
        const color = active ? "#fff" : "#7a6344";
        const fill = active ? "rgba(255,255,255,0.25)" : "rgba(122,99,68,0.12)";
        return (
          <button key={opt.id} onClick={() => onChange(opt.id)} style={{
            flex: 1, padding: "8px 6px", borderRadius: 10, fontSize: 12, fontWeight: active ? 600 : 400,
            background: active ? "linear-gradient(135deg, #7a6344, #9e8564)" : "rgba(255,255,255,0.8)",
            color: active ? "#fff" : "#6a5e4e",
            border: active ? "none" : "1px solid #d6cbb8",
            transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          }}>
            <svg width="40" height="32" viewBox="0 0 60 48">
              {opt.id === "plafond" ? (
                <>
                  {/* Ceiling rail at very top */}
                  <line x1="5" y1="3" x2="55" y2="3" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                  {/* Two curtain panels floor-to-ceiling */}
                  <rect x="8" y="5" width="20" height="39" rx="1" fill={fill} />
                  <rect x="32" y="5" width="20" height="39" rx="1" fill={fill} />
                  {/* Floor line */}
                  <line x1="5" y1="46" x2="55" y2="46" stroke={color} strokeWidth="1" strokeDasharray="3 2" />
                </>
              ) : opt.id === "cadre" ? (
                <>
                  {/* Window frame */}
                  <rect x="12" y="12" width="36" height="28" rx="1" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
                  {/* Rail on frame top edge */}
                  <line x1="8" y1="12" x2="52" y2="12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
                  {/* Two curtain panels from frame downward */}
                  <rect x="14" y="14" width="14" height="30" rx="1" fill={fill} />
                  <rect x="32" y="14" width="14" height="30" rx="1" fill={fill} />
                  {/* Floor line */}
                  <line x1="5" y1="46" x2="55" y2="46" stroke={color} strokeWidth="1" strokeDasharray="3 2" />
                </>
              ) : (
                <>
                  {/* Decorative rod (thicker) */}
                  <line x1="8" y1="10" x2="52" y2="10" stroke={color} strokeWidth="3" strokeLinecap="round" />
                  {/* Rod finials */}
                  <circle cx="8" cy="10" r="3" fill={color} />
                  <circle cx="52" cy="10" r="3" fill={color} />
                  {/* Rings */}
                  <circle cx="18" cy="14" r="2" fill="none" stroke={color} strokeWidth="1" />
                  <circle cx="30" cy="14" r="2" fill="none" stroke={color} strokeWidth="1" />
                  <circle cx="42" cy="14" r="2" fill="none" stroke={color} strokeWidth="1" />
                  {/* Two curtain panels */}
                  <rect x="10" y="16" width="16" height="28" rx="1" fill={fill} />
                  <rect x="34" y="16" width="16" height="28" rx="1" fill={fill} />
                  {/* Floor line */}
                  <line x1="5" y1="46" x2="55" y2="46" stroke={color} strokeWidth="1" strokeDasharray="3 2" />
                </>
              )}
            </svg>
            <span style={{ fontSize: 11 }}>{t(opt.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
