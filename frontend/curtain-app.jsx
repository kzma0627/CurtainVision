import { useState, useRef, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════
const API_BASE = "http://localhost:8000";

const CURTAIN_STYLES = [
  { id: "sheer-white", name: "Sheer White", desc: "Light & translucent, modern minimal",
    gradient: "linear-gradient(180deg, rgba(255,252,248,0.95), rgba(240,236,228,0.9))", accent: "#e8e4dc" },
  { id: "linen-beige", name: "Linen Beige", desc: "Natural texture, warm & cozy",
    gradient: "linear-gradient(180deg, rgba(212,197,169,0.95), rgba(195,180,152,0.9))", accent: "#c4b493" },
  { id: "grey-modern", name: "Modern Grey", desc: "Urban chic, goes with everything",
    gradient: "linear-gradient(180deg, rgba(164,164,164,0.95), rgba(130,130,130,0.9))", accent: "#8a8a8a" },
  { id: "blush-pink", name: "Blush Pink", desc: "Soft & romantic, gentle warmth",
    gradient: "linear-gradient(180deg, rgba(232,196,192,0.95), rgba(220,180,176,0.9))", accent: "#d4a8a3" },
  { id: "sage-green", name: "Sage Green", desc: "Fresh & calming, nature-inspired",
    gradient: "linear-gradient(180deg, rgba(181,196,168,0.95), rgba(160,178,145,0.9))", accent: "#a3b692" },
  { id: "navy-stripe", name: "Navy Stripe", desc: "Classic stripes, refined taste",
    gradient: "repeating-linear-gradient(90deg, rgba(44,62,107,0.85) 0px, rgba(44,62,107,0.85) 3px, rgba(70,90,140,0.4) 3px, rgba(70,90,140,0.4) 14px)", accent: "#3a5080" },
  { id: "gold-jacquard", name: "Gold Jacquard", desc: "Luxurious pattern, opulent feel",
    gradient: "linear-gradient(135deg, rgba(201,168,76,0.9), rgba(180,150,60,0.8), rgba(210,178,86,0.9))", accent: "#b8982e" },
  { id: "cream-embroidered", name: "Cream Embroidered", desc: "Delicate embroidery, quiet elegance",
    gradient: "linear-gradient(180deg, rgba(245,238,225,0.95), rgba(230,218,198,0.9))", accent: "#d4c8b0" },
];

const MODES = [
  { id: "closed", label: "Fully Closed", icon: "▮▮", desc: "Full coverage" },
  { id: "half", label: "Half Open", icon: "▯▮", desc: "Pulled to one side" },
  { id: "open", label: "Fully Open", icon: "▯▯", desc: "Gathered at sides" },
];

// ═══════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════

function UploadZone({ onFile }) {
  const [over, setOver] = useState(false);
  const ref = useRef();

  const handle = useCallback((file) => {
    if (file && file.type.startsWith("image/")) onFile(file);
  }, [onFile]);

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]); }}
      style={{
        width: "100%", maxWidth: 540, aspectRatio: "4/3", margin: "0 auto",
        border: `2.5px dashed ${over ? "#7a6344" : "#c0b49e"}`,
        borderRadius: 24, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", cursor: "pointer",
        background: over ? "rgba(122,99,68,0.04)" : "rgba(250,247,242,0.6)",
        transition: "all 0.3s",
      }}
    >
      <input ref={ref} type="file" accept="image/*" hidden
        onChange={e => handle(e.target.files[0])} />
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" style={{ opacity: 0.45, marginBottom: 16 }}>
        <rect x="6" y="10" width="44" height="36" rx="4" stroke="#7a6344" strokeWidth="1.8" />
        <path d="M6 36l12-12 9 9 7-7 16 16" stroke="#7a6344" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
        <circle cx="19" cy="21" r="3.5" stroke="#7a6344" strokeWidth="1.8" />
        <path d="M28 3v11M23 8.5l5-5.5 5 5.5" stroke="#7a6344" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p style={{ fontSize: 17, color: "#4a3f32", margin: 0, fontWeight: 500 }}>
        Click to upload or drag your window photo here
      </p>
      <p style={{ fontSize: 13, color: "#9e9282", marginTop: 8 }}>
        JPG / PNG / WEBP - under 2MB recommended
      </p>
    </div>
  );
}

function StyleCard({ s, selected, onClick }) {
  const active = selected?.id === s.id;
  return (
    <div onClick={onClick} style={{ width: 130, cursor: "pointer", transition: "transform 0.2s", transform: active ? "scale(1.06)" : "scale(1)" }}>
      <div style={{
        height: 168, borderRadius: 14, position: "relative", overflow: "hidden",
        border: active ? "3px solid #7a6344" : "3px solid transparent",
        boxShadow: active ? "0 8px 28px rgba(122,99,68,0.3)" : "0 2px 10px rgba(0,0,0,0.07)",
        transition: "all 0.25s",
      }}>
        <div style={{ width: "100%", height: "100%", background: s.gradient, position: "relative" }}>
          {/* Curtain rod */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 12,
            background: "linear-gradient(180deg, #bba882, #9a896a, #bba882)",
          }} />
          {/* Fold lines */}
          {[18, 42, 66, 90, 114].map((x, i) => (
            <div key={i} style={{
              position: "absolute", left: x, top: 12, width: 1, height: "calc(100% - 12px)",
              background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.06) 30%, rgba(255,255,255,0.06) 50%, rgba(0,0,0,0.06) 70%, transparent)",
            }} />
          ))}
        </div>
        {active && (
          <div style={{
            position: "absolute", top: 7, right: 7, width: 22, height: 22, borderRadius: "50%",
            background: "#7a6344", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3L10 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          </div>
        )}
      </div>
      <p style={{
        fontSize: 12.5, textAlign: "center", marginTop: 7, lineHeight: 1.3,
        fontWeight: active ? 600 : 400, color: active ? "#3a3022" : "#7a6e5e",
      }}>{s.name}</p>
    </div>
  );
}

function ModeSelector({ mode, setMode }) {
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
      {MODES.map(m => (
        <button key={m.id} onClick={() => setMode(m.id)} style={{
          padding: "10px 22px", borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
          border: mode === m.id ? "2px solid #7a6344" : "2px solid #d8d0c4",
          background: mode === m.id ? "rgba(122,99,68,0.08)" : "#fff",
          color: mode === m.id ? "#4a3820" : "#8a7e6e",
          fontWeight: mode === m.id ? 600 : 400, fontSize: 14,
        }}>
          <span style={{ fontSize: 16, display: "block", marginBottom: 3 }}>{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ progress, status }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{
        height: 6, borderRadius: 3, background: "#e8e2d8", overflow: "hidden", marginBottom: 16,
      }}>
        <div style={{
          height: "100%", borderRadius: 3, transition: "width 0.5s ease",
          background: "linear-gradient(90deg, #7a6344, #a6916e)",
          width: `${progress}%`,
        }} />
      </div>
      <p style={{ fontSize: 15, color: "#5a4e3e", margin: 0 }}>{status}</p>
    </div>
  );
}

// CSS overlay preview (before AI generation)
function QuickPreview({ imageUrl, style, mode }) {
  if (!style) return null;
  const getPos = () => {
    if (mode === "closed") return { left: "8%", right: "8%" };
    if (mode === "half") return { left: "52%", right: "8%" };
    return { left: "82%", right: "8%", opacity: 0.25 };
  };
  const pos = getPos();
  return (
    <div style={{ position: "relative", maxWidth: 560, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 36px rgba(0,0,0,0.13)" }}>
      <img src={imageUrl} alt="window" style={{ width: "100%", display: "block" }} />
      <div style={{
        position: "absolute", top: "6%", bottom: "4%", ...pos,
        background: style.gradient, transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
        backdropFilter: "blur(2px)",
      }}>
        {[0.15, 0.30, 0.45, 0.60, 0.75, 0.90].map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: `${p * 100}%`, top: 0, width: 1, height: "100%",
            background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.05) 25%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.05) 75%, transparent)",
          }} />
        ))}
        <div style={{
          position: "absolute", top: -2, left: -6, right: -6, height: 7, borderRadius: 3,
          background: "linear-gradient(180deg, #bba882, #9a896a, #bba882)",
        }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════
export default function CurtainVisionApp() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [style, setStyle] = useState(null);
  const [mode, setMode] = useState("closed");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => { setFadeKey(k => k + 1); }, [step]);

  const handleFile = (f) => { setFile(f); setImageUrl(URL.createObjectURL(f)); setStep(1); };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setProgress(0);
    setStatusText("Uploading your photo...");
    setStep(3);

    try {
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) { clearInterval(progressTimer); return 90; }
          const increment = prev < 30 ? 8 : prev < 60 ? 4 : 2;
          return Math.min(prev + increment, 90);
        });
      }, 800);

      setTimeout(() => setStatusText("AI is analyzing window structure..."), 2000);
      setTimeout(() => setStatusText("Generating curtain effect..."), 6000);
      setTimeout(() => setStatusText("Refining details, almost done..."), 12000);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("style", style.id);
      formData.append("mode", mode);

      const resp = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressTimer);

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${resp.status})`);
      }

      const data = await resp.json();

      if (data.success) {
        setProgress(100);
        setStatusText("Generation complete!");
        setResultUrl(`${API_BASE}${data.result_url}`);
        setTimeout(() => setStep(4), 600);
      } else {
        throw new Error(data.error || "Generation failed");
      }
    } catch (e) {
      setError(e.message);
      setStep(2);
    } finally {
      setGenerating(false);
    }
  };

  const reset = () => {
    setStep(0); setFile(null); setImageUrl(null);
    setStyle(null); setResultUrl(null); setError(null);
  };

  const btnPrimary = {
    padding: "13px 44px", fontSize: 15, fontWeight: 600, color: "#fff",
    background: "linear-gradient(135deg, #7a6344, #9e8564)", border: "none",
    borderRadius: 12, cursor: "pointer", boxShadow: "0 6px 22px rgba(122,99,68,0.3)",
    transition: "all 0.2s",
  };
  const btnSecondary = {
    padding: "12px 30px", fontSize: 14, fontWeight: 500, color: "#7a6344",
    background: "#fff", border: "2px solid #c8bca8", borderRadius: 12, cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(155deg, #faf8f4 0%, #f2ede5 35%, #eae3d8 100%)",
      fontFamily: "'SF Pro Display', -apple-system, 'Segoe UI', Roboto, sans-serif",
    }}>
      {/* -- Header -- */}
      <header style={{
        padding: "22px 36px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(122,99,68,0.1)", background: "rgba(250,248,244,0.8)",
        backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={reset}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #7a6344, #9e8564)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 3px 10px rgba(122,99,68,0.3)",
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="2" width="14" height="2" rx="1" fill="#fff"/>
              <path d="M5 4v14c0 0 1.5-2.5 2.5-2.5s1.5 1.8 2.5 1.8 1.5-1.8 2.5-1.8S14 18 15 18V4" stroke="#fff" strokeWidth="1.3" fill="none"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: "#3a3022", margin: 0, letterSpacing: 0.5 }}>
              CurtainVision
            </h1>
            <p style={{ fontSize: 11, color: "#9a8e7e", margin: 0, letterSpacing: 1.5 }}>AI Curtain Preview</p>
          </div>
        </div>
        {/* Steps */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["Upload", "Style", "Preview", "Result"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: step >= i ? "#7a6344" : "#ddd5c8", color: step >= i ? "#fff" : "#a09484",
                transition: "all 0.3s",
              }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: step >= i ? "#5a4e3e" : "#b8ad9c" }}>{label}</span>
              {i < 3 && <div style={{ width: 16, height: 1, background: step > i ? "#7a6344" : "#ddd5c8", transition: "all 0.3s" }} />}
            </div>
          ))}
        </div>
      </header>

      {/* -- Main -- */}
      <main key={fadeKey} style={{
        maxWidth: 960, margin: "0 auto", padding: "36px 20px",
        animation: "fadeUp 0.35s ease",
      }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* ---- Step 0: Upload ---- */}
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>Upload Your Window Photo</h2>
            <p style={{ fontSize: 15, color: "#8a7e6e", marginBottom: 32 }}>Take a front-facing photo of your window and let AI generate a curtain preview</p>
            <UploadZone onFile={handleFile} />
            <div style={{ marginTop: 36, display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { i: "📸", t: "Front-facing shots work best" },
                { i: "💡", t: "Good lighting improves accuracy" },
                { i: "📐", t: "Include the full window frame" },
              ].map((tip, j) => (
                <span key={j} style={{ fontSize: 13, color: "#8a7e6e", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{tip.i}</span>{tip.t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---- Step 1: Select Style ---- */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>Choose Your Curtain Style</h2>
              <p style={{ fontSize: 14, color: "#8a7e6e" }}>Browse our collection and pick your favorite</p>
            </div>
            {/* Thumbnail of uploaded image */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{ position: "relative" }}>
                <img src={imageUrl} alt="" style={{ height: 140, borderRadius: 12, objectFit: "cover", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
                <button onClick={reset} style={{
                  position: "absolute", top: -8, right: -8, width: 26, height: 26, borderRadius: "50%",
                  border: "none", background: "#d9534f", color: "#fff", cursor: "pointer", fontSize: 15,
                  fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
              </div>
            </div>
            {/* Style grid */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginBottom: 32 }}>
              {CURTAIN_STYLES.map(s => (
                <StyleCard key={s.id} s={s} selected={style} onClick={() => setStyle(s)} />
              ))}
            </div>
            {/* Proceed */}
            {style && (
              <div style={{
                textAlign: "center", padding: 22, background: "rgba(255,255,255,0.7)",
                borderRadius: 16, maxWidth: 440, margin: "0 auto",
              }}>
                <p style={{ fontSize: 17, fontWeight: 600, color: "#3a3022", margin: "0 0 4px" }}>Selected: {style.name}</p>
                <p style={{ fontSize: 13, color: "#8a7e6e", margin: "0 0 18px" }}>{style.desc}</p>
                <button onClick={() => setStep(2)} style={btnPrimary}>Preview Effect →</button>
              </div>
            )}
          </div>
        )}

        {/* ---- Step 2: Preview & Generate ---- */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>Preview Curtain Effect</h2>
              <p style={{ fontSize: 14, color: "#8a7e6e" }}>Switch modes to see different looks, then generate a high-quality AI render</p>
            </div>
            <div style={{ marginBottom: 24 }}><ModeSelector mode={mode} setMode={setMode} /></div>
            <QuickPreview imageUrl={imageUrl} style={style} mode={mode} />

            {/* Info tags */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
              <span style={{ padding: "8px 16px", background: "rgba(255,255,255,0.8)", borderRadius: 8, fontSize: 13, color: "#5a4e3e" }}>
                🎨 {style?.name}
              </span>
              <span style={{ padding: "8px 16px", background: "rgba(255,255,255,0.8)", borderRadius: 8, fontSize: 13, color: "#5a4e3e" }}>
                📐 {MODES.find(m => m.id === mode)?.label}
              </span>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                maxWidth: 500, margin: "20px auto 0", padding: "14px 20px",
                background: "#fff5f5", border: "1px solid #fcc", borderRadius: 12,
                color: "#c0392b", fontSize: 14, textAlign: "center",
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>← Change Style</button>
              <button onClick={handleGenerate} disabled={generating} style={{
                ...btnPrimary,
                opacity: generating ? 0.6 : 1, cursor: generating ? "not-allowed" : "pointer",
              }}>
                🤖 Generate AI Render
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#b0a494", marginTop: 16 }}>
              💡 The overlay above is a quick preview. AI generation produces a much more realistic result (~15-30s)
            </p>
          </div>
        )}

        {/* ---- Step 3: Generating ---- */}
        {step === 3 && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{
              width: 80, height: 80, margin: "0 auto 28px", borderRadius: 20,
              background: "linear-gradient(135deg, #7a6344, #9e8564)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulse 2s infinite",
            }}>
              <style>{`@keyframes pulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.08); opacity:0.85; } }`}</style>
              <span style={{ fontSize: 36 }}>🎨</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#3a3022", marginBottom: 20 }}>AI is creating your preview...</h2>
            <ProgressBar progress={progress} status={statusText} />
            <div style={{ marginTop: 40, display: "flex", gap: 20, justifyContent: "center", opacity: 0.6 }}>
              <div style={{ textAlign: "center" }}>
                <img src={imageUrl} alt="" style={{ height: 100, borderRadius: 10, objectFit: "cover" }} />
                <p style={{ fontSize: 12, color: "#8a7e6e", marginTop: 6 }}>Original Photo</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 24, color: "#b0a494" }}>→</div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  height: 100, width: 130, borderRadius: 10, background: style?.gradient || "#eee",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 28 }}>✨</span>
                </div>
                <p style={{ fontSize: 12, color: "#8a7e6e", marginTop: 6 }}>{style?.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* ---- Step 4: Result ---- */}
        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>Your Preview is Ready 🎉</h2>
            <p style={{ fontSize: 14, color: "#8a7e6e", marginBottom: 24 }}>AI-generated curtain effect based on your window photo</p>

            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              {/* Result image */}
              <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 44px rgba(0,0,0,0.14)" }}>
                <img src={resultUrl} alt="AI Generated Result" style={{ width: "100%", display: "block" }}
                  onError={(e) => { e.target.style.display = "none"; }} />
              </div>

              {/* Comparison row */}
              <div style={{ display: "flex", gap: 16, marginTop: 20, justifyContent: "center" }}>
                <div style={{ flex: 1, maxWidth: 280 }}>
                  <img src={imageUrl} alt="Original" style={{ width: "100%", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  <p style={{ fontSize: 12, color: "#8a7e6e", marginTop: 6 }}>📷 Original Photo</p>
                </div>
                <div style={{ flex: 1, maxWidth: 280 }}>
                  <img src={resultUrl} alt="Result" style={{ width: "100%", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  <p style={{ fontSize: 12, color: "#8a7e6e", marginTop: 6 }}>✨ AI Render - {style?.name}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>← Try Another Style</button>
              <button onClick={() => { setMode(mode === "closed" ? "half" : mode === "half" ? "open" : "closed"); setStep(2); }} style={btnSecondary}>
                🔄 Change Mode
              </button>
              <a href={resultUrl} download={`curtain_${style?.id}_${mode}.png`} style={{ textDecoration: "none" }}>
                <button style={btnPrimary}>📥 Download Image</button>
              </a>
            </div>
            <button onClick={reset} style={{
              ...btnSecondary, marginTop: 16, border: "none", background: "transparent", color: "#9a8e7e",
            }}>
              Start Over with a New Photo
            </button>
          </div>
        )}
      </main>

      {/* -- Footer -- */}
      <footer style={{
        textAlign: "center", padding: 24, color: "#b8ad9c", fontSize: 12,
        borderTop: "1px solid rgba(122,99,68,0.06)", marginTop: 40,
      }}>
        CurtainVision &copy; 2026 - Powered by AI
      </footer>
    </div>
  );
}
