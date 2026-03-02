import { useState, useRef, useCallback, useEffect } from "react";

const API_BASE = "http://localhost:8000";

function WindowPicker({ onSelect }) {
  const [windows, setWindows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef();

  useEffect(() => {
    fetch(API_BASE + "/api/windows")
      .then(r => r.json())
      .then(data => { setWindows(data.windows || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSelect = (w) => {
    setSelected(w.filename);
    onSelect({ previewUrl: w.preview_url, githubUrl: w.github_url, filename: w.filename });
  };

  // 保留手动上传入口（MVP 阶段仅展示，不实际发送文件）
  const handleManualUpload = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const localUrl = URL.createObjectURL(file);
    setSelected("__manual__");
    // 手动上传时没有 GitHub URL，后端 MVP 模式下无法处理
    // 这里仅供展示，提示用户使用预设照片
    onSelect({ previewUrl: localUrl, githubUrl: null, filename: file.name, isManual: true });
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <p style={{ fontSize: 14, color: "#8a7e6e", textAlign: "center", marginBottom: 20 }}>
        请选择一张示例窗户照片，或点击下方上传自定义照片
      </p>

      {loading ? (
        <p style={{ textAlign: "center", color: "#b0a494" }}>加载中...</p>
      ) : windows.length === 0 ? (
        <p style={{ textAlign: "center", color: "#c0b49e" }}>
          暂无预设照片，请将窗户照片放入 resources/windows 文件夹并推送到 GitHub
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginBottom: 24 }}>
          {windows.map(w => (
            <div
              key={w.filename}
              onClick={() => handleSelect(w)}
              style={{
                width: 130, cursor: "pointer",
                transform: selected === w.filename ? "scale(1.06)" : "scale(1)",
                transition: "transform 0.2s",
              }}
            >
              <div style={{
                height: 100, borderRadius: 12, overflow: "hidden",
                border: selected === w.filename ? "3px solid #7a6344" : "3px solid transparent",
                boxShadow: selected === w.filename
                  ? "0 6px 20px rgba(122,99,68,0.3)"
                  : "0 2px 8px rgba(0,0,0,0.08)",
                transition: "all 0.2s",
              }}>
                <img
                  src={w.preview_url}
                  alt={w.filename}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
              <p style={{
                fontSize: 11, textAlign: "center", marginTop: 5,
                color: selected === w.filename ? "#3a3022" : "#9a8e7e",
                fontWeight: selected === w.filename ? 600 : 400,
              }}>
                {w.filename}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 手动上传（MVP 阶段提示） */}
      <div style={{ textAlign: "center" }}>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={e => handleManualUpload(e.target.files[0])} />
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            padding: "8px 20px", borderRadius: 20, border: "1.5px dashed #c0b49e",
            background: "transparent", color: "#9a8e7e", cursor: "pointer", fontSize: 13,
          }}
        >
          📂 上传自定义照片（仅预览，需推送 GitHub 后方可生成）
        </button>
      </div>
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
  const [windowPhoto, setWindowPhoto] = useState(null); // { previewUrl, githubUrl, filename, isManual? }
  const [styles, setStyles] = useState([]);
  const [style, setStyle] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);
  const [fadeKey, setFadeKey] = useState(0);
  const [orderConfig, setOrderConfig] = useState({
    width: "",
    height: "",
    quantity: 1,
    room: "客厅",
    notes: "",
  });
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderError, setOrderError] = useState(null);

  useEffect(() => { setFadeKey(k => k + 1); }, [step]);

  useEffect(() => {
    fetch(API_BASE + "/api/styles")
      .then(r => r.json())
      .then(data => setStyles(data.styles))
      .catch(() => {});
  }, []);

  const reset = () => {
    setStep(0);
    setWindowPhoto(null);
    setStyle(null);
    setResultUrl(null);
    setError(null);
    setProgress(0);
    setOrderConfig({
      width: "",
      height: "",
      quantity: 1,
      room: "客厅",
      notes: "",
    });
    setOrderSubmitting(false);
    setOrderSubmitted(false);
    setOrderError(null);
  };

  const handleWindowSelect = (w) => {
    setWindowPhoto(w);
    if (!w.isManual) setStep(1);
    // 手动上传时停在 step 0，仅显示预览，不推进
  };

  const handleGenerate = async () => {
    if (!windowPhoto?.githubUrl) {
      setError("请选择一张预设窗户照片（需要 GitHub 公开 URL 才能生成）");
      return;
    }

    setGenerating(true);
    setError(null);
    setProgress(0);
    setStatusText("正在提交任务...");
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
      formData.append("style", style.id);
      formData.append("window_url", windowPhoto.githubUrl);

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
        setTimeout(() => { setGenerating(false); setStep(4); }, 800);
      } else {
        throw new Error(data.error || "生成失败");
      }
    } catch (e) {
      setGenerating(false);
      setError(e.message);
      setStep(2);
    }
  };

  const basePrice = 1980;
  const widthNum = parseFloat(orderConfig.width || "0");
  const heightNum = parseFloat(orderConfig.height || "0");
  const quantityNum = Number(orderConfig.quantity) || 1;
  const areaFactor =
    !widthNum || !heightNum ? 1 : Math.max((widthNum * heightNum) / 3, 1);
  const totalPrice = Math.round(basePrice * areaFactor * quantityNum);

  const handleCheckout = async () => {
    if (!windowPhoto || !style || !resultUrl) {
      setOrderError("请先完成效果图生成，再结算。");
      return;
    }
    setOrderSubmitting(true);
    setOrderError(null);
    try {
      const payload = {
        windowPhoto,
        style,
        config: orderConfig,
        pricing: {
          basePrice,
          totalPrice,
          currency: "CNY",
        },
        resultUrl,
        createdAt: new Date().toISOString(),
      };
      const resp = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || data.error || "保存订单失败");
      }
      setOrderSubmitted(true);
    } catch (e) {
      setOrderError(e.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const btnPrimary = {
    padding: "12px 32px", borderRadius: 28, border: "none",
    background: "linear-gradient(135deg, #7a6344, #9e8564)",
    color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(122,99,68,0.28)", transition: "opacity 0.2s",
  };
  const btnSecondary = {
    padding: "12px 24px", borderRadius: 28,
    border: "1.5px solid #c0b49e", background: "rgba(255,255,255,0.8)",
    color: "#6a5e4e", fontSize: 14, cursor: "pointer",
  };

  const steps = ["上传照片", "选择款式", "确认生成", "生成中"];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #faf7f2 0%, #f0ebe0 100%)", fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif" }}>
      <header style={{ padding: "20px 32px 0", borderBottom: "1px solid rgba(122,99,68,0.08)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3a3022", margin: 0 }}>
            帘想 <span style={{ fontWeight: 300, color: "#9a8e7e" }}>CurtainVision</span>
          </h1>
        </div>
        <div style={{ maxWidth: 960, margin: "16px auto 0", display: "flex", gap: 8, alignItems: "center", paddingBottom: 16 }}>
          {steps.map((label, i) => (
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

        {/* Step 0: 选择窗户照片 */}
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>选择窗户照片</h2>
            <p style={{ fontSize: 15, color: "#8a7e6e", marginBottom: 32 }}>从示例照片中选择，AI 将为您生成纱帘效果图</p>
            <WindowPicker onSelect={handleWindowSelect} />
            {windowPhoto?.isManual && (
              <div style={{ marginTop: 20, padding: "12px 20px", background: "#fff8e8", borderRadius: 12, maxWidth: 480, margin: "20px auto 0", fontSize: 13, color: "#8a6a2a" }}>
                ⚠️ 自定义照片仅可预览，如需生成效果图请将照片推送至 GitHub 后刷新选择
              </div>
            )}
          </div>
        )}

        {/* Step 1: 选择款式 */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>选择纱帘款式</h2>
              <p style={{ fontSize: 14, color: "#8a7e6e" }}>浏览纱帘系列，选择您心仪的款式</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{ position: "relative" }}>
                <img src={windowPhoto?.previewUrl} alt="" style={{ height: 140, borderRadius: 12, objectFit: "cover", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
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

        {/* Step 2: 确认生成 */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: "#3a3022", marginBottom: 6 }}>确认生成</h2>
              <p style={{ fontSize: 14, color: "#8a7e6e" }}>确认您的窗户照片和选择的款式，然后点击生成</p>
            </div>
            <div style={{ display: "flex", gap: 24, justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <img src={windowPhoto?.previewUrl} alt="window" style={{ height: 240, borderRadius: 14, objectFit: "cover", boxShadow: "0 6px 20px rgba(0,0,0,0.1)" }} />
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

        {/* Step 3: 生成中 */}
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
                <img src={windowPhoto?.previewUrl} alt="" style={{ height: 100, borderRadius: 10, objectFit: "cover" }} />
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

        {/* Step 4: 结果 */}
        {step === 4 && (
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "flex-start",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "2 1 380px", textAlign: "center" }}>
              <h2
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#3a3022",
                  marginBottom: 6,
                }}
              >
                效果图生成完成 🎉
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: "#8a7e6e",
                  marginBottom: 24,
                }}
              >
                AI 根据您的窗户照片和所选纱帘生成的效果图
              </p>
              <div style={{ maxWidth: 600, margin: "0 auto" }}>
                <div
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 12px 44px rgba(0,0,0,0.14)",
                  }}
                >
                  <img
                    src={resultUrl}
                    alt="result"
                    style={{ width: "100%", display: "block" }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginTop: 20,
                    justifyContent: "center",
                  }}
                >
                  <div style={{ flex: 1, maxWidth: 280 }}>
                    <img
                      src={windowPhoto?.previewUrl}
                      alt="original"
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    />
                    <p
                      style={{
                        fontSize: 12,
                        color: "#8a7e6e",
                        marginTop: 6,
                      }}
                    >
                      原始照片
                    </p>
                  </div>
                  <div style={{ flex: 1, maxWidth: 280 }}>
                    <img
                      src={resultUrl}
                      alt="result"
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    />
                    <p
                      style={{
                        fontSize: 12,
                        color: "#8a7e6e",
                        marginTop: 6,
                      }}
                    >
                      AI 效果图 · {style?.name}
                    </p>
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  marginTop: 28,
                  flexWrap: "wrap",
                }}
              >
                <button onClick={() => setStep(1)} style={btnSecondary}>
                  ← 换个款式
                </button>
                <a
                  href={resultUrl}
                  download={"curtain_" + style?.id + ".png"}
                  style={{ textDecoration: "none" }}
                >
                  <button style={btnPrimary}>下载效果图</button>
                </a>
              </div>
              <button
                onClick={reset}
                style={{
                  ...btnSecondary,
                  marginTop: 16,
                  border: "none",
                  background: "transparent",
                  color: "#9a8e7e",
                }}
              >
                重新选择照片
              </button>
            </div>

            <div
              style={{
                flex: "1 1 260px",
                background: "rgba(255,255,255,0.9)",
                borderRadius: 18,
                padding: 20,
                boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                border: "1px solid #e4dacb",
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#3a3022",
                  marginTop: 0,
                  marginBottom: 12,
                }}
              >
                订单配置 & 结算
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: "#a09484",
                  marginTop: 0,
                  marginBottom: 12,
                }}
              >
                参考 Pfister 配置器的结构，这里汇总本次窗帘方案，方便后续线下跟进。
              </p>
              <div style={{ fontSize: 13, color: "#5a4e3e", marginBottom: 12 }}>
                <div style={{ marginBottom: 4 }}>
                  <strong>窗户照片：</strong>
                  {windowPhoto?.filename}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>纱帘款式：</strong>
                  {style?.name}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#8a7e6e",
                    marginBottom: 4,
                  }}
                >
                  窗口宽度（米）
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={orderConfig.width}
                  onChange={(e) =>
                    setOrderConfig((c) => ({ ...c, width: e.target.value }))
                  }
                  placeholder="例如 2.4"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #d6cbb8",
                    fontSize: 13,
                  }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#8a7e6e",
                    marginBottom: 4,
                  }}
                >
                  窗口高度（米）
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={orderConfig.height}
                  onChange={(e) =>
                    setOrderConfig((c) => ({ ...c, height: e.target.value }))
                  }
                  placeholder="例如 2.7"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #d6cbb8",
                    fontSize: 13,
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#8a7e6e",
                      marginBottom: 4,
                    }}
                  >
                    数量（幅）
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={orderConfig.quantity}
                    onChange={(e) =>
                      setOrderConfig((c) => ({
                        ...c,
                        quantity: Number(e.target.value || 1),
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #d6cbb8",
                      fontSize: 13,
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: "#8a7e6e",
                      marginBottom: 4,
                    }}
                  >
                    空间
                  </label>
                  <input
                    type="text"
                    value={orderConfig.room}
                    onChange={(e) =>
                      setOrderConfig((c) => ({ ...c, room: e.target.value }))
                    }
                    placeholder="如 客厅 / 主卧"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #d6cbb8",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#8a7e6e",
                    marginBottom: 4,
                  }}
                >
                  备注（可选）
                </label>
                <textarea
                  rows={3}
                  value={orderConfig.notes}
                  onChange={(e) =>
                    setOrderConfig((c) => ({ ...c, notes: e.target.value }))
                  }
                  placeholder="例如：希望偏暖白、配遮光帘、预算范围等"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #d6cbb8",
                    fontSize: 13,
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background:
                    "linear-gradient(135deg, rgba(122,99,68,0.06), rgba(158,133,100,0.08))",
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#3a3022",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span>参考单价</span>
                  <span>¥ {basePrice.toLocaleString("zh-CN")}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span>尺寸系数（约）</span>
                  <span>× {areaFactor.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 700,
                    marginTop: 4,
                  }}
                >
                  <span>预估总价</span>
                  <span>¥ {totalPrice.toLocaleString("zh-CN")}</span>
                </div>
              </div>

              {orderError && (
                <div
                  style={{
                    marginBottom: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "#fff5f5",
                    border: "1px solid #f5c2c0",
                    color: "#b1261a",
                    fontSize: 12,
                  }}
                >
                  {orderError}
                </div>
              )}
              {orderSubmitted && (
                <div
                  style={{
                    marginBottom: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "#f0fff4",
                    border: "1px solid #9ae6b4",
                    color: "#276749",
                    fontSize: 12,
                  }}
                >
                  已将本次配置发送到 Airtable，可在后台查看并跟进客户。
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={orderSubmitting}
                style={{
                  ...btnPrimary,
                  width: "100%",
                  opacity: orderSubmitting ? 0.7 : 1,
                  marginTop: 4,
                }}
              >
                {orderSubmitting ? "正在提交到 Airtable..." : "发送配置到 Airtable"}
              </button>
            </div>
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
