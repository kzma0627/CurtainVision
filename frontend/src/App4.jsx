import { useState, useRef, useCallback, useEffect } from "react";

const API_BASE = "http://localhost:8000";

const MODES = [
  { id: "closed", label: "拉上纱帘", icon: "▮▮" },
  { id: "half", label: "半开纱帘", icon: "▯▮" },
  { id: "open", label: "完全打开", icon: "▯▯" },
];

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
        点击上传 或 拖拽窗户照片到这里
      </p>
      <p style={{ fontSize: 13, color: "#9e9282", marginTop: 8 }}>
        JPG / PNG / WEBP · 建议 2MB 以内
      </p>
    </div>
  );
}

function StyleCard({ s, selected, onClick }) {
  const active = selected?.id === s.id;
  return (
    <div onClick={onClick} style={{
      width: 150, cursor: "pointer",
      transform: active ? "scale(1.06)" : "scale(1)",
      transition: "transform 0.2s",
    }}>
      <div style={{
        height: 180, borderRadius: 14, overflow: "hidden", position: "relative",
        border: active ? "3px solid #7a6344" : "3px solid transparent",
        boxShadow: active ? "0 8px 28px rgba(122,99,68,0.3)" : "0 2px 10px rgba(0,0,0,0.07)",
        transition: "all 0.25s",
      }}>
        <img
          src={s.preview_url}
          alt={s.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={e => { e.target.style.background = "#eee"; }}
        />
        {active && (
          <div style={{
            position: "absolute", top: 7, right: 7, width: 22, height: 22,
            borderRadius: "50%", background: "#7a6344",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 6l3 3L10 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        )}
      </div>
      <p style={{
        fontSize: 13, textAlign: "center", marginTop: 7,
        fontWeight: active ? 600 : 400,
        color: active ? "#3a3022" : "#7a6e5e",
      }}>{s.name}</p>
    </div>
  );
}

function ProgressBar({ progress, status }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div style={{ height: 6, borderRadius: 3, background: "#e8e2d8", overflow: "hidden", marginBottom: 16 }}>
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

export default function CurtainVisionApp() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [styles, setStyles] = useState([]);
  const [style, setStyle] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => { setFadeKey(k => k + 1); }, [step]);

  // 从后端加载款式列表
  useEffect(() => {
    fetch(API_BASE + "/api/styles")
      .then(r => r.json())
      .then(data => setStyles(data.styles))
      .catch(() => {});
  }, []);

  const handleFile = (f) => {
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
    setStep(1);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setProgress(0);
    setStatusText("正在上传照片...");
    setStep(3);

    try {
      const progressTimer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) { clearInterval(progressTimer); return 90; }
          const inc = prev < 30 ? 8 : prev < 60 ? 4 : 2;
          return Math.min(prev + inc, 90);
        });
      }, 800);

      setTimeout(() => setStatusText("AI 正在分析窗户结构..."), 2000);
      setTimeout(() => setStatusText("正在生成纱帘效果..."), 6000);
      setTimeout(() => setStatusText("优化细节中，即将完成..."), 12000);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("style", style.id);

      const resp = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressTimer);

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "服务器错误 (" + resp.status + ")");
      }

      const data = await resp.json();

      if (data.success) {
        setProgress(100);
        setStatusText("生成完成！");
        setResultUrl(API_BASE + data.result_url);
        setTimeout(() => setStep(4), 600);
      } else {
        throw new Error(data.error || "生成失败");
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
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(155deg, #faf8f4 0%, #f2ede5 35%, #eae3d8 100%)",
      fontFamily: "'Noto Sans SC', 'SF Pro Display', -apple-system, sans-serif",
    }}>
      {/* Header */}
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
              <rect x="3" y="2" width="14" height="2" rx="1" fill="#fff" />
              <path d="M5 4v14c0 0 1.5-2.5 2.5-2.5s1.5 1.8 2.5 1.8 1.5-1.8 2.5-1.8S14 18 15 18V4" stroke="#fff" strokeWidth="1.3" fill="none" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: "#3a3022", margin: 0 }}>帘想 CurtainVision</h1>
            <p style={{ fontSize: 11, color: "#9a8e7e", margin: 0, letterSpacing: 1.5 }}>AI 智能窗帘预览</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["上传", "选款", "预览", "结果"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: step >= i ? "#7a6344" : "#ddd5c8",
                color: step >= i ? "#fff" : "#a09484", transition: "all 0.3s",
              }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: step >= i ? "#5a4e3e" : "#b8ad9c" }}>{label}</span>
              {i < 3 && <div style={{ width: 16, height: 1, background: step > i ? "#7a6344" : "#ddd5c8" }} />}
            </div>
          ))}
        </div>
      </header>

      <main key={fadeKey} style={{
        maxWidth: 960, margin: "0 auto", padding: "36px 20px",
        animation: "fadeUp 0.35s ease",
      }}>
        <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* Step 0: Upload */}
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>上传您的窗户照片</h2>
            <p style={{ fontSize: 15, color: "#8a7e6e", marginBottom: 32 }}>拍一张正面窗户照片，AI 将为您生成纱帘效果图</p>
            <UploadZone onFile={handleFile} />
            <div style={{ marginTop: 36, display: "flex", gap: 28, justifyContent: "center", flexWrap: "wrap" }}>
              {[{ i: "📸", t: "正面拍摄效果最佳" }, { i: "💡", t: "光线充足更准确" }, { i: "📐", t: "包含完整窗框" }].map((tip, j) => (
                <span key={j} style={{ fontSize: 13, color: "#8a7e6e", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18 }}>{tip.i}</span>{tip.t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Select Style */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>选择纱帘款式</h2>
              <p style={{ fontSize: 14, color: "#8a7e6e" }}>浏览纱帘系列，选择您心仪的款式</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{ position: "relative" }}>
                <img src={imageUrl} alt="" style={{ height: 140, borderRadius: 12, objectFit: "cover", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
                <button onClick={reset} style={{
                  position: "absolute", top: -8, right: -8, width: 26, height: 26,
                  borderRadius: "50%", border: "none", background: "#d9534f",
                  color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>×</button>
              </div>
            </div>
            {styles.length === 0 ? (
              <p style={{ textAlign: "center", color: "#8a7e6e" }}>加载款式中...</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginBottom: 32 }}>
                {styles.map(s => (
                  <StyleCard key={s.id} s={s} selected={style} onClick={() => setStyle(s)} />
                ))}
              </div>
            )}
            {style && (
              <div style={{
                textAlign: "center", padding: 22, background: "rgba(255,255,255,0.7)",
                borderRadius: 16, maxWidth: 440, margin: "0 auto",
              }}>
                <p style={{ fontSize: 17, fontWeight: 600, color: "#3a3022", margin: "0 0 4px" }}>已选择：{style.name}</p>
                <button onClick={() => setStep(2)} style={btnPrimary}>预览效果 →</button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview & Generate */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>确认生成</h2>
              <p style={{ fontSize: 14, color: "#8a7e6e" }}>确认您的窗户照片和选择的款式，然后点击生成</p>
            </div>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <img src={imageUrl} alt="window" style={{ height: 240, borderRadius: 14, objectFit: "cover", boxShadow: "0 6px 20px rgba(0,0,0,0.1)" }} />
                <p style={{ fontSize: 13, color: "#8a7e6e", marginTop: 8 }}>您的窗户照片</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 28, color: "#b0a494", paddingTop: 80 }}>+</div>
              <div style={{ textAlign: "center" }}>
                <img src={style?.preview_url} alt="style" style={{ height: 240, borderRadius: 14, objectFit: "cover", boxShadow: "0 6px 20px rgba(0,0,0,0.1)" }} />
                <p style={{ fontSize: 13, color: "#8a7e6e", marginTop: 8 }}>{style?.name}</p>
              </div>
            </div>
            {error && (
              <div style={{
                maxWidth: 500, margin: "20px auto 0", padding: "14px 20px",
                background: "#fff5f5", border: "1px solid #fcc", borderRadius: 12,
                color: "#c0392b", fontSize: 14, textAlign: "center",
              }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 28 }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>← 换一款</button>
              <button onClick={handleGenerate} style={btnPrimary}>AI 生成效果图</button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 3 && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{
              width: 80, height: 80, margin: "0 auto 28px", borderRadius: 20,
              background: "linear-gradient(135deg, #7a6344, #9e8564)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulse 2s infinite",
            }}>
              <style>{`@keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }`}</style>
              <span style={{ fontSize: 36 }}>🎨</span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#3a3022", marginBottom: 20 }}>AI 正在创作中...</h2>
            <ProgressBar progress={progress} status={statusText} />
            <div style={{ marginTop: 40, display: "flex", gap: 24, justifyContent: "center", opacity: 0.6 }}>
              <div style={{ textAlign: "center" }}>
                <img src={imageUrl} alt="" style={{ height: 100, borderRadius: 10, objectFit: "cover" }} />
                <p style={{ fontSize: 12, color: "#8a7e6e", marginTop: 6 }}>原始照片</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", fontSize: 24, color: "#b0a494" }}>→</div>
              <div style={{ textAlign: "center" }}>
                <img src={style?.preview_url} alt="" style={{ height: 100, borderRadius: 10, objectFit: "cover" }} />
                <p style={{ fontSize: 12, color: "#8a7e6e", marginTop: 6 }}>{style?.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>效果图生成完成 🎉</h2>
            <p style={{ fontSize: 14, color: "#8a7e6e", marginBottom: 24 }}>AI 根据您的窗户照片和所选纱帘生成的效果图</p>
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 44px rgba(0,0,0,0.14)" }}>
                <img src={resultUrl} alt="result" style={{ width: "100%", display: "block" }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 20, justifyContent: "center" }}>
                <div style={{ flex: 1, maxWidth: 280 }}>
                  <img src={imageUrl} alt="original" style={{ width: "100%", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  <p style={{ fontSize: 12, color: "#8a7e6e", marginTop: 6 }}>原始照片</p>
                </div>
                <div style={{ flex: 1, maxWidth: 280 }}>
                  <img src={resultUrl} alt="result" style={{ width: "100%", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  <p style={{ fontSize: 12, color: "#8a7e6e", marginTop: 6 }}>AI 效果图 · {style?.name}</p>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              <button onClick={() => setStep(1)} style={btnSecondary}>← 换个款式</button>
              <a href={resultUrl} download={"curtain_" + style?.id + ".png"} style={{ textDecoration: "none" }}>
                <button style={btnPrimary}>下载效果图</button>
              </a>
            </div>
            <button onClick={reset} style={{ ...btnSecondary, marginTop: 16, border: "none", background: "transparent", color: "#9a8e7e" }}>
              上传新照片重新开始
            </button>
          </div>
        )}
      </main>

      <footer style={{
        textAlign: "center", padding: 24, color: "#b8ad9c", fontSize: 12,
        borderTop: "1px solid rgba(122,99,68,0.06)", marginTop: 40,
      }}>
        帘想 CurtainVision © 2026 · Powered by AI
      </footer>
    </div>
  );
}
