import { useTranslation } from "react-i18next";
import { PLEAT_OPTIONS } from "../data/fabrics";

export default function PleatSelector({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {PLEAT_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            flex: 1, padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: active ? 600 : 400,
            background: active ? "linear-gradient(135deg, #7a6344, #9e8564)" : "rgba(255,255,255,0.8)",
            color: active ? "#fff" : "#6a5e4e",
            border: active ? "none" : "1px solid #d6cbb8",
            transition: "all 0.2s",
          }}>{t(opt.labelKey)}</button>
        );
      })}
    </div>
  );
}
