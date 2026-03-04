import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, FABRIC_CATEGORIES } from "../data/fabrics";

export default function FabricSelector({ selectedStyle, onSelectStyle }) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState(FABRIC_CATEGORIES[0].id);
  const currentCategory = FABRIC_CATEGORIES.find((c) => c.id === activeCategory);

  const handleStyleClick = (style) => {
    if (selectedStyle?.id === style.id) return;
    onSelectStyle({ ...style, categoryId: currentCategory.id, categoryName: t(currentCategory.nameKey) });
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {FABRIC_CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
              padding: "6px 14px", borderRadius: 16, fontSize: 12, fontWeight: active ? 600 : 400,
              background: active ? "linear-gradient(135deg, #7a6344, #9e8564)" : "rgba(255,255,255,0.8)",
              color: active ? "#fff" : "#6a5e4e",
              border: active ? "none" : "1px solid #d6cbb8",
              transition: "all 0.2s",
            }}>{t(cat.nameKey)}</button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: "#8a7e6e", marginBottom: 8 }}>{t(currentCategory?.descKey)}</p>
      {currentCategory?.styles.length === 0 ? (
        <div style={{ padding: "20px 16px", textAlign: "center", borderRadius: 12, border: "1.5px dashed #d6cbb8", color: "#b0a494", fontSize: 13 }}>
          {t("fabric.comingSoon")}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
            {currentCategory?.styles.map((s) => {
              const active = selectedStyle?.id === s.id;
              return (
                <div key={s.id} style={{ width: 72 }}>
                  <div onClick={() => handleStyleClick(s)}
                    style={{
                      position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", cursor: "pointer",
                      border: active ? "2.5px solid #7a6344" : "2.5px solid transparent",
                      boxShadow: active ? "0 3px 12px rgba(122,99,68,0.3)" : "0 1px 6px rgba(0,0,0,0.06)",
                      transition: "all 0.2s",
                    }}>
                    <img src={API_BASE + s.thumbnail} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {active && (
                      <div style={{
                        position: "absolute", top: 4, right: 4, width: 18, height: 18,
                        borderRadius: "50%", background: "#7a6344",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3L10 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedStyle && currentCategory?.styles.some((s) => s.id === selectedStyle.id) && (
            <div style={{
              marginTop: 10, position: "relative", borderRadius: 10, overflow: "hidden",
              border: "1px solid #e4dacb", background: "#faf8f4",
              animation: "fadeUp 0.25s ease",
            }}>
              <img
                src={API_BASE + selectedStyle.detail}
                alt={t("fabric.realPhoto", { name: selectedStyle.categoryName })}
                style={{ width: "100%", display: "block", borderRadius: 10 }}
              />
              <div style={{
                position: "absolute", bottom: 8, left: 8,
                background: "rgba(0,0,0,0.5)", color: "#fff",
                padding: "3px 10px", borderRadius: 6, fontSize: 11,
              }}>
                {t("fabric.realPhoto", { name: selectedStyle.categoryName })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
