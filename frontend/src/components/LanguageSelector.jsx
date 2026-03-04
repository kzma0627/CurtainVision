import { useTranslation } from "react-i18next";

const LANGS = ["fr", "de", "en", "zh"];

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();

  return (
    <select
      value={i18n.language?.substring(0, 2) || "fr"}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      style={{
        padding: "4px 8px",
        borderRadius: 8,
        border: "1px solid #d6cbb8",
        background: "rgba(255,255,255,0.8)",
        color: "#5a4e3e",
        fontSize: 12,
        cursor: "pointer",
        outline: "none",
      }}
    >
      {LANGS.map((lng) => (
        <option key={lng} value={lng}>
          {t(`lang.${lng}`)}
        </option>
      ))}
    </select>
  );
}
