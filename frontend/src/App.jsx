import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { API_BASE } from "./data/fabrics";
import useIsMobile from "./hooks/useIsMobile";
import { calculatePrice, BASE_PRICE, CURRENCY } from "./utils/pricing";
import { fetchWindows } from "./utils/api";
import { useCart } from "./contexts/CartContext";
import { useAuth } from "./contexts/AuthContext";

import FabricSelector from "./components/FabricSelector";
import PleatSelector from "./components/PleatSelector";
import ArrangementSelector from "./components/ArrangementSelector";
import InstallationSelector from "./components/InstallationSelector";
import LengthSelector from "./components/LengthSelector";
import ProgressBar from "./components/ProgressBar";
import DimensionInput from "./components/DimensionInput";
import LanguageSelector from "./components/LanguageSelector";
import CartDrawer from "./components/CartDrawer";
import AuthModal from "./components/AuthModal";

export default function CurtainVisionApp() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  // ——— Window photo ———
  const [windows, setWindows] = useState([]);
  const [windowPhoto, setWindowPhoto] = useState(null);
  const [photoLabel, setPhotoLabel] = useState("");
  const fileRef = useRef();

  // ——— Config ———
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [pleatMultiplier, setPleatMultiplier] = useState(2);
  const [lengthType, setLengthType] = useState("floor");
  const [arrangement, setArrangement] = useState("double");
  const [installationType, setInstallationType] = useState("plafond");

  // ——— Generation ———
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);

  // ——— Display toggle ———
  const [showOriginal, setShowOriginal] = useState(false);

  // ——— Debug ———
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  // ——— Order ———
  const [showOrder, setShowOrder] = useState(false);
  const [orderWidth, setOrderWidth] = useState("");
  const [orderHeight, setOrderHeight] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [rollerType, setRollerType] = useState("standard");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderError, setOrderError] = useState(null);

  // ——— Cart ———
  const { addItem, items: cartItems } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartToast, setCartToast] = useState(false);

  // ——— Auth ———
  const { token, guestUUID, isAuthenticated, checkRateLimit, setShowAuthModal } = useAuth();

  // Load windows
  useEffect(() => {
    fetchWindows().then(setWindows).catch(() => {});
  }, []);

  const handleWindowSelect = (w) => {
    setWindowPhoto({ previewUrl: w.preview_url, githubUrl: w.github_url, filename: w.filename });
    setResultUrl(null);
    setShowOrder(false);
    setShowOriginal(false);
  };

  const handleManualUpload = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const localUrl = URL.createObjectURL(file);
    setWindowPhoto({ previewUrl: localUrl, githubUrl: null, filename: file.name, isManual: true, file });
    setResultUrl(null);
    setShowOrder(false);
    setShowOriginal(false);
  };

  // Can generate: either a githubUrl (preset) or a file object (upload)
  const canGenerate = !!(windowPhoto && (windowPhoto.githubUrl || windowPhoto.file) && selectedStyle && !generating);

  const handleGenerate = async () => {
    if (!canGenerate) return;

    // Rate limit check
    try {
      const limitStatus = await checkRateLimit();
      if (limitStatus.allowed === false) {
        if (!isAuthenticated) {
          setShowAuthModal(true);
          return;
        }
        if (limitStatus.reason === "hourly_limit") setError(t("auth.hourlyLimit"));
        else if (limitStatus.reason === "daily_limit") setError(t("auth.dailyLimit"));
        else setError(t("auth.limitReached"));
        return;
      }
    } catch {
      // If rate limit check fails, allow generation (graceful degradation)
    }

    setGenerating(true);
    setError(null);
    setProgress(0);
    setStatusText(t("generate.submitting"));
    setResultUrl(null);
    setShowOrder(false);
    setShowOriginal(false);

    try {
      const progressTimer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) { clearInterval(progressTimer); return 90; }
          return Math.min(prev + (prev < 30 ? 8 : prev < 60 ? 4 : 2), 90);
        });
      }, 800);
      setTimeout(() => setStatusText(t("generate.analyzing")), 2000);
      setTimeout(() => setStatusText(t("generate.rendering")), 6000);
      setTimeout(() => setStatusText(t("generate.finishing")), 12000);

      const formData = new FormData();
      formData.append("style", selectedStyle.id);

      // Send file or URL depending on upload type
      if (windowPhoto.isManual && windowPhoto.file) {
        formData.append("window_file", windowPhoto.file);
      } else {
        formData.append("window_url", windowPhoto.githubUrl);
      }

      formData.append("pleat_multiplier", String(pleatMultiplier));
      formData.append("length_type", lengthType);
      formData.append("fabric_category", selectedStyle.categoryId || "");
      formData.append("arrangement", arrangement);
      formData.append("installation_type", installationType);
      if (guestUUID) formData.append("guest_uuid", guestUUID);

      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(`${API_BASE}/api/generate`, { method: "POST", body: formData, headers });
      clearInterval(progressTimer);

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const detail = typeof errData.detail === "object" ? errData.detail.message || errData.detail.error : errData.detail;
        throw new Error(detail || errData.error || t("generate.serverError") + ` (${resp.status})`);
      }
      const data = await resp.json();
      if (data.success) {
        setProgress(100);
        setStatusText(t("generate.done"));
        if (data.debug) setDebugInfo(data.debug);
        setTimeout(() => { setGenerating(false); setResultUrl(API_BASE + data.result_url); }, 600);
      } else {
        throw new Error(data.error || t("generate.failed"));
      }
    } catch (e) {
      setGenerating(false);
      setError(e.message);
    }
  };

  // Pricing
  const pricing = calculatePrice({ width: orderWidth, height: orderHeight, pleatMultiplier, quantity: orderQuantity });

  const handleCheckout = async () => {
    if (!resultUrl) { setOrderError(t("order.generateFirst")); return; }
    setOrderSubmitting(true);
    setOrderError(null);
    try {
      const payload = {
        windowPhoto, photoLabel, style: selectedStyle,
        config: { pleatMultiplier, lengthType, arrangement, installationType, width: orderWidth, height: orderHeight, quantity: orderQuantity, rollerType, notes: orderNotes },
        pricing: { basePrice: BASE_PRICE, totalPrice: pricing.totalPrice, currency: CURRENCY },
        resultUrl, createdAt: new Date().toISOString(),
      };
      const resp = await fetch(`${API_BASE}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.detail || d.error || t("generate.failed")); }
      setOrderSubmitted(true);
    } catch (e) { setOrderError(e.message); }
    finally { setOrderSubmitting(false); }
  };

  const handleAddToCart = () => {
    addItem({
      windowPhoto: windowPhoto ? { previewUrl: windowPhoto.previewUrl, githubUrl: windowPhoto.githubUrl, filename: windowPhoto.filename, isManual: windowPhoto.isManual } : null,
      photoLabel,
      style: selectedStyle,
      pleatMultiplier,
      lengthType,
      arrangement,
      installationType,
      dimensions: { width: orderWidth, height: orderHeight },
      quantity: orderQuantity,
      rollerType,
      notes: orderNotes,
      resultUrl,
      pricing: { basePrice: BASE_PRICE, areaFactor: pricing.areaFactor, pleatFactor: pricing.pleatFactor, totalPrice: pricing.totalPrice, currency: CURRENCY },
    });
    setCartToast(true);
    setTimeout(() => setCartToast(false), 2000);
  };

  // Styles
  const sectionLabel = { fontSize: 12, fontWeight: 600, color: "#5a4e3e", marginBottom: 6, marginTop: 14 };
  const btnPrimary = {
    padding: "10px 24px", borderRadius: 22, border: "none",
    background: "linear-gradient(135deg, #7a6344, #9e8564)",
    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
    boxShadow: "0 3px 12px rgba(122,99,68,0.25)", transition: "opacity 0.2s", width: "100%",
  };

  // ——— Left panel content ———
  const leftContent = () => {
    if (generating) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 400 }}>
          <div style={{ width: 64, height: 64, marginBottom: 20, borderRadius: 16, background: "linear-gradient(135deg, #7a6344, #9e8564)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 2s infinite" }}>
            <span style={{ fontSize: 28 }}>&#127912;</span>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#3a3022", marginBottom: 14 }}>{t("generate.creating")}</h3>
          <div style={{ width: "80%", maxWidth: 360 }}>
            <ProgressBar progress={progress} status={statusText} />
          </div>
        </div>
      );
    }

    if (resultUrl) {
      const displayUrl = showOriginal ? windowPhoto?.previewUrl : resultUrl;
      const displayLabel = showOriginal ? t("result.original") : t("result.aiPreview");
      return (
        <div style={{ position: "relative" }}>
          <img src={displayUrl} alt={displayLabel} style={{ width: "100%", borderRadius: 12, display: "block", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }} />
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.55)", color: "#fff", padding: "4px 10px", borderRadius: 8, fontSize: 11 }}>
            {displayLabel}
          </div>
          <button onClick={() => setShowOriginal(!showOriginal)} style={{
            position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)", color: "#5a4e3e",
            border: "1px solid #d6cbb8", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 500,
            cursor: "pointer", backdropFilter: "blur(4px)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a4e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
            </svg>
            {showOriginal ? t("result.viewResult") : t("result.viewOriginal")}
          </button>
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center", alignItems: "center" }}>
            <a href={resultUrl} download={"curtain_" + (selectedStyle?.id || "") + ".png"} style={{ textDecoration: "none" }}>
              <button style={{ ...btnPrimary, width: "auto", padding: "8px 20px", fontSize: 12 }}>{t("result.download")}</button>
            </a>
            {debugInfo && (
              <button onClick={() => setShowDebug(!showDebug)} style={{
                padding: "8px 12px", borderRadius: 12, border: "1px solid #d6cbb8",
                background: showDebug ? "rgba(122,99,68,0.1)" : "rgba(255,255,255,0.9)",
                color: "#5a4e3e", fontSize: 11, fontWeight: 500, cursor: "pointer",
              }}>
                {showDebug ? "Hide Debug" : "Debug"}
              </button>
            )}
          </div>
          {showDebug && debugInfo && (
            <div style={{ marginTop: 12, padding: 12, background: "rgba(0,0,0,0.03)", borderRadius: 10, border: "1px solid #e8e0d2", fontSize: 11, color: "#3a3022" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Duration:</span>
                <span>{(debugInfo.duration_ms / 1000).toFixed(1)}s</span>
              </div>
              {debugInfo.overlay_url && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Overlay sent to AI:</span>
                  <img src={API_BASE + debugInfo.overlay_url} alt="overlay" style={{ width: "100%", borderRadius: 8, border: "1px solid #d6cbb8" }} />
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Prompt:</span>
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 10, lineHeight: 1.4, background: "rgba(255,255,255,0.7)", padding: 8, borderRadius: 6, margin: 0, maxHeight: 160, overflowY: "auto" }}>
                  {debugInfo.prompt}
                </pre>
              </div>
              {debugInfo.ref_urls?.length > 0 && (
                <div>
                  <span style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>Ref images:</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {debugInfo.ref_urls.map((u, i) => (
                      <img key={i} src={u} alt={`ref-${i}`} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6, border: "1px solid #d6cbb8" }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (windowPhoto) {
      return (
        <div style={{ position: "relative" }}>
          <img src={windowPhoto.previewUrl} alt="" style={{ width: "100%", borderRadius: 12, display: "block", boxShadow: "0 6px 24px rgba(0,0,0,0.08)" }} />
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.45)", color: "#fff", padding: "4px 10px", borderRadius: 8, fontSize: 11 }}>
            {photoLabel || windowPhoto.filename}
          </div>
          <button
            onClick={() => { setWindowPhoto(null); setResultUrl(null); setShowOrder(false); }}
            style={{
              position: "absolute", bottom: 12, right: 12, background: "rgba(255,255,255,0.9)", color: "#5a4e3e",
              border: "1px solid #d6cbb8", borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 500,
              cursor: "pointer", backdropFilter: "blur(4px)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a4e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            {t("photo.change")}
          </button>
        </div>
      );
    }

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: 400, borderRadius: 14, border: "2px dashed #d6cbb8",
        background: "rgba(255,255,255,0.4)", color: "#8a7e6e", textAlign: "center", padding: 32,
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" style={{ marginBottom: 14, opacity: 0.5 }}>
          <rect x="4" y="8" width="40" height="32" rx="3" fill="none" stroke="#b0a494" strokeWidth="2" />
          <circle cx="16" cy="20" r="4" fill="none" stroke="#b0a494" strokeWidth="1.5" />
          <path d="M4 32l12-8 8 6 8-10 12 12" stroke="#b0a494" strokeWidth="1.5" fill="none" />
        </svg>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "#5a4e3e" }}>{t("photo.selectPrompt")}</p>
        <p style={{ fontSize: 12, marginBottom: 16, color: "#b0a494" }}>{t("photo.selectSub")}</p>

        {windows.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            {windows.map((w) => (
              <div key={w.filename} onClick={() => handleWindowSelect(w)}
                style={{ width: 80, height: 60, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: "2px solid transparent", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", transition: "all 0.15s" }}>
                <img src={w.preview_url} alt={w.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleManualUpload(e.target.files[0])} />
        <button onClick={() => fileRef.current?.click()} style={{
          padding: "8px 20px", borderRadius: 16, border: "1px dashed #c0b49e",
          background: "rgba(255,255,255,0.7)", color: "#7a6e5e", fontSize: 12, fontWeight: 500,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a6e5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {t("photo.upload")}
        </button>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ padding: isMobile ? "12px 16px" : "14px 32px", borderBottom: "1px solid rgba(122,99,68,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: "#3a3022", margin: 0 }}>
            {t("brand")} <span style={{ fontWeight: 300, color: "#9a8e7e", fontSize: isMobile ? 12 : 14 }}>{t("brandSub")}</span>
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LanguageSelector />
            {/* Cart icon */}
            <button onClick={() => setCartOpen(true)} style={{ position: "relative", padding: "6px", borderRadius: 8, border: "1px solid #d6cbb8", background: "rgba(255,255,255,0.8)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5a4e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {cartItems.length > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%",
                  background: "#c0392b", color: "#fff", fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{cartItems.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{
        maxWidth: 1200, margin: "0 auto",
        padding: isMobile ? "16px" : "24px 32px",
        display: "flex", flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 16 : 28, alignItems: "flex-start",
      }}>
        {/* Left panel */}
        <div style={{ flex: "1 1 0", minWidth: 0, position: isMobile ? "relative" : "sticky", top: isMobile ? undefined : 24 }}>
          {leftContent()}
        </div>

        {/* Right panel */}
        <div style={{
          width: isMobile ? "100%" : 320, flexShrink: 0,
          background: "rgba(255,255,255,0.85)", borderRadius: 16,
          padding: isMobile ? 16 : 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #e8e0d2",
          maxHeight: isMobile ? "none" : "calc(100vh - 100px)", overflowY: "auto",
        }}>
          {/* Scene photo */}
          <div style={sectionLabel}>{t("section.scenePhoto")}</div>
          {windowPhoto ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(122,99,68,0.04)", borderRadius: 10 }}>
              <img src={windowPhoto.previewUrl} alt="" style={{ width: 40, height: 30, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
              <input type="text" value={photoLabel} onChange={(e) => setPhotoLabel(e.target.value)}
                placeholder={t("photo.addNote")}
                style={{ flex: 1, padding: "4px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 11, background: "#fff" }} />
            </div>
          ) : (
            <p style={{ fontSize: 11, color: "#b0a494", padding: "8px 0" }}>{t("photo.selectLeft")}</p>
          )}

          {/* Fabric */}
          <div style={sectionLabel}>{t("section.fabric")}</div>
          <FabricSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
          {selectedStyle && (
            <p style={{ fontSize: 11, color: "#5a4e3e", marginTop: 6, background: "rgba(122,99,68,0.04)", padding: "4px 8px", borderRadius: 6 }}>
              {t("section.selected", { name: selectedStyle.categoryName })}
            </p>
          )}

          {/* Arrangement */}
          <div style={sectionLabel}>{t("section.arrangement")}</div>
          <ArrangementSelector value={arrangement} onChange={setArrangement} />

          {/* Installation type */}
          <div style={sectionLabel}>{t("section.installation")}</div>
          <InstallationSelector value={installationType} onChange={setInstallationType} />

          {/* Pleat */}
          <div style={sectionLabel}>{t("section.pleat")}</div>
          <PleatSelector value={pleatMultiplier} onChange={setPleatMultiplier} />

          {/* Length */}
          <div style={sectionLabel}>{t("section.length")}</div>
          <LengthSelector value={lengthType} onChange={setLengthType} />

          {/* Error */}
          {error && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff5f5", border: "1px solid #fcc", borderRadius: 8, color: "#c0392b", fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={!canGenerate}
            style={{ ...btnPrimary, marginTop: 16, opacity: canGenerate ? 1 : 0.45, cursor: canGenerate ? "pointer" : "not-allowed" }}>
            {generating ? t("generate.generating") : t("generate.btn")}
          </button>

          {!windowPhoto && <p style={{ fontSize: 10, color: "#b0a494", textAlign: "center", marginTop: 6 }}>{t("generate.selectPhotoFirst")}</p>}
          {windowPhoto && !selectedStyle && <p style={{ fontSize: 10, color: "#b0a494", textAlign: "center", marginTop: 6 }}>{t("generate.selectFabric")}</p>}

          {/* Cart toast */}
          {cartToast && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#f0fff4", border: "1px solid #9ae6b4", borderRadius: 8, color: "#276749", fontSize: 12, textAlign: "center", animation: "fadeUp 0.2s ease" }}>
              {t("cart.added")}
            </div>
          )}

          {/* Order button */}
          {resultUrl && !showOrder && (
            <button onClick={() => setShowOrder(true)} style={{
              width: "100%", marginTop: 8, padding: "10px 24px", borderRadius: 22,
              border: "1.5px solid #7a6344", background: "transparent",
              color: "#7a6344", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            }}>
              {t("order.customAndOrder")}
            </button>
          )}

          {/* Order section */}
          {showOrder && resultUrl && (
            <div style={{ marginTop: 12, paddingTop: 14, borderTop: "1px solid #e4dacb", animation: "fadeUp 0.3s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#3a3022" }}>{t("order.customAndOrder")}</span>
                <button onClick={() => setShowOrder(false)} style={{ background: "none", border: "none", color: "#b0a494", fontSize: 16, cursor: "pointer", padding: "2px 6px" }}>&times;</button>
              </div>

              <div style={{ ...sectionLabel, marginTop: 0 }}>{t("order.dimensions")}</div>
              <DimensionInput width={orderWidth} height={orderHeight} onWidthChange={setOrderWidth} onHeightChange={setOrderHeight} />

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#8a7e6e", marginBottom: 2 }}>{t("order.quantity")}</label>
                  <input type="number" min="1" value={orderQuantity} onChange={(e) => setOrderQuantity(Number(e.target.value || 1))}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 12 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#8a7e6e", marginBottom: 2 }}>{t("order.rollerType")}</label>
                  <select value={rollerType} onChange={(e) => setRollerType(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 12, background: "#fff" }}>
                    <option value="standard">{t("order.rollerStandard")}</option>
                    <option value="silent">{t("order.rollerSilent")}</option>
                    <option value="heavy">{t("order.rollerHeavy")}</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <label style={{ display: "block", fontSize: 11, color: "#8a7e6e", marginBottom: 2 }}>{t("order.notes")}</label>
                <textarea rows={2} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder={t("order.notesPlaceholder")}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 12, resize: "vertical" }} />
              </div>

              {/* Pricing */}
              <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "linear-gradient(135deg, rgba(122,99,68,0.06), rgba(158,133,100,0.08))", fontSize: 12, color: "#3a3022" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span>{t("order.refPrice")}</span><span>{CURRENCY} {BASE_PRICE}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span>{t("order.sizeFactor")}</span><span>&times;{pricing.areaFactor.toFixed(2)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span>{t("order.pleatFactor")}</span><span>&times;{pricing.pleatFactor.toFixed(2)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 3, paddingTop: 3, borderTop: "1px solid rgba(122,99,68,0.1)" }}>
                  <span>{t("order.estimatedTotal")}</span><span>{CURRENCY} {pricing.totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {orderError && <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 6, background: "#fff5f5", border: "1px solid #f5c2c0", color: "#b1261a", fontSize: 11 }}>{orderError}</div>}
              {orderSubmitted && <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 6, background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", fontSize: 11 }}>{t("order.submitted")}</div>}

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={handleCheckout} disabled={orderSubmitting}
                  style={{ ...btnPrimary, flex: 1, opacity: orderSubmitting ? 0.7 : 1 }}>
                  {orderSubmitting ? t("order.submitting") : t("order.submit")}
                </button>
                <button onClick={handleAddToCart} style={{
                  flex: 1, padding: "10px 24px", borderRadius: 22,
                  border: "1.5px solid #7a6344", background: "transparent",
                  color: "#7a6344", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  {t("order.addToCart")}
                </button>
              </div>

              <div style={{ marginTop: 8, textAlign: "center" }}>
                <a href={resultUrl} download={"curtain_" + (selectedStyle?.id || "") + ".png"} style={{ fontSize: 12, color: "#8a7e6e" }}>
                  {t("order.save")}
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: 16, color: "#b8ad9c", fontSize: 10, borderTop: "1px solid rgba(122,99,68,0.06)", marginTop: 24 }}>
        {t("footer")}
      </footer>

      {/* Overlays */}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <AuthModal />
    </div>
  );
}
