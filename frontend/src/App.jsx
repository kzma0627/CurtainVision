import { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:8000";

// ═══════════════════════════════════════════════════════
// 数据定义
// ═══════════════════════════════════════════════════════

const FABRIC_CATEGORIES = [
  {
    id: "sheerSolar",
    name: "阳光纱",
    description: "防晒控光，适合朝南窗户",
    styles: [
      { id: "sheerSolar1", thumbnail: "/resources/sheerSolar1-2.jpg", detail: "/resources/sheerSolar1-1.jpg", ref: "sheerSolar1-1.jpg" },
      { id: "sheerSolar2", thumbnail: "/resources/sheerSolar2-2.jpg", detail: "/resources/sheerSolar2-1.jpg", ref: "sheerSolar2-1.jpg" },
      { id: "sheerSolar3", thumbnail: "/resources/sheerSolar3-2.jpg", detail: "/resources/sheerSolar3-1.jpg", ref: "sheerSolar3-1.jpg" },
    ],
  },
  {
    id: "sheerPrivacy",
    name: "隐私纱",
    description: "透光不透影，保护隐私",
    styles: [
      { id: "sheerPrivacy1", thumbnail: "/resources/sheerPrivacy1-2.png", detail: "/resources/sheerPrivacy1-1.png", ref: "sheerPrivacy1-1.png" },
      { id: "sheerPrivacy2", thumbnail: "/resources/sheerPrivacy2-2.png", detail: "/resources/sheerPrivacy2-1.png", ref: "sheerPrivacy2-1.png" },
    ],
  },
  {
    id: "sheerDurable",
    name: "耐用纱",
    description: "持久耐用，易于清洗",
    styles: [
      { id: "sheerDurable1", thumbnail: "/resources/sheerDurable1-2.png", detail: "/resources/sheerDurable1-1.png", ref: "sheerDurable1-1.png" },
    ],
  },
];

const PLEAT_OPTIONS = [
  { value: 1.5, label: "1.5 倍褶" },
  { value: 2, label: "2 倍褶" },
  { value: 2.5, label: "2.5 倍褶" },
];

const ARRANGEMENT_OPTIONS = [
  { id: "double", label: "双开" },
  { id: "left", label: "左单开" },
  { id: "right", label: "右单开" },
];

// ═══════════════════════════════════════════════════════
// 工具 Hooks
// ═══════════════════════════════════════════════════════

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

// ═══════════════════════════════════════════════════════
// 子组件
// ═══════════════════════════════════════════════════════

/* ——— 面料选择器（点击缩略图选中 + 内联展开实拍图） ——— */
function FabricSelector({ selectedStyle, onSelectStyle }) {
  const [activeCategory, setActiveCategory] = useState(FABRIC_CATEGORIES[0].id);
  const currentCategory = FABRIC_CATEGORIES.find((c) => c.id === activeCategory);

  const handleStyleClick = (style) => {
    // 如果点击的是已选中的，取消展开（再次点击折叠）
    if (selectedStyle?.id === style.id) {
      // 保持选中，不取消
      return;
    }
    onSelectStyle({ ...style, categoryId: currentCategory.id, categoryName: currentCategory.name });
  };

  return (
    <div>
      {/* 分类 Tab */}
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
            }}>{cat.name}</button>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: "#8a7e6e", marginBottom: 8 }}>{currentCategory?.description}</p>
      {currentCategory?.styles.length === 0 ? (
        <div style={{ padding: "20px 16px", textAlign: "center", borderRadius: 12, border: "1.5px dashed #d6cbb8", color: "#b0a494", fontSize: 13 }}>
          即将上新
        </div>
      ) : (
        <div>
          {/* 缩略图行 + 内联实拍图 */}
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

          {/* 内联实拍图展示（选中某款式时展开） */}
          {selectedStyle && currentCategory?.styles.some((s) => s.id === selectedStyle.id) && (
            <div style={{
              marginTop: 10, position: "relative", borderRadius: 10, overflow: "hidden",
              border: "1px solid #e4dacb", background: "#faf8f4",
              animation: "fadeUp 0.25s ease",
            }}>
              <img
                src={API_BASE + selectedStyle.detail}
                alt="实拍图"
                style={{ width: "100%", display: "block", borderRadius: 10 }}
              />
              <div style={{
                position: "absolute", bottom: 8, left: 8,
                background: "rgba(0,0,0,0.5)", color: "#fff",
                padding: "3px 10px", borderRadius: 6, fontSize: 11,
              }}>
                {selectedStyle.categoryName} 实拍
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ——— 褶皱选择 ——— */
function PleatSelector({ value, onChange }) {
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
          }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

/* ——— 窗帘布置选择 ——— */
function ArrangementSelector({ value, onChange }) {
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
            {/* 简易示意 SVG */}
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
            <span style={{ fontSize: 11 }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ——— 长度选择 ——— */
function LengthSelector({ value, onChange }) {
  const options = [
    { id: "floor", label: "垂至地面" },
    { id: "windowsill", label: "覆盖窗户" },
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
            <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? "#3a3022" : "#7a6e5e" }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ——— 进度条 ——— */
function ProgressBar({ progress, status }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ height: 4, borderRadius: 2, background: "#e8e2d8", overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", borderRadius: 2, transition: "width 0.5s ease", background: "linear-gradient(90deg, #7a6344, #a6916e)", width: `${progress}%` }} />
      </div>
      <p style={{ fontSize: 13, color: "#5a4e3e", margin: 0 }}>{status}</p>
    </div>
  );
}

/* ——— 尺寸输入（含线稿图）——— */
function DimensionInput({ width, height, onWidthChange, onHeightChange }) {
  const inputStyle = { padding: "7px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 13, width: "100%", textAlign: "center", background: "#fff" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 11, color: "#8a7e6e", whiteSpace: "nowrap" }}>宽 D</label>
        <input type="number" min="0" step="1" placeholder="cm" value={width} onChange={(e) => onWidthChange(e.target.value)} style={{ ...inputStyle, width: 72 }} />
        <span style={{ fontSize: 11, color: "#8a7e6e" }}>cm</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 20 }}>
          <label style={{ fontSize: 11, color: "#8a7e6e" }}>高 B</label>
          <input type="number" min="0" step="1" placeholder="cm" value={height} onChange={(e) => onHeightChange(e.target.value)} style={{ ...inputStyle, width: 64 }} />
          <span style={{ fontSize: 11, color: "#8a7e6e" }}>cm</span>
        </div>
        <svg width="140" height="170" viewBox="0 0 240 300" style={{ flexShrink: 0 }}>
          <rect x="0" y="0" width="240" height="240" fill="#f8f5ef" />
          <rect x="0" y="240" width="240" height="60" fill="#d4b896" />
          <line x1="0" y1="12" x2="240" y2="12" stroke="#d6cbb8" strokeWidth="1" />
          <line x1="30" y1="30" x2="210" y2="30" stroke="#5a4e3e" strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="30" r="5" fill="none" stroke="#5a4e3e" strokeWidth="2" />
          <circle cx="210" cy="30" r="5" fill="none" stroke="#5a4e3e" strokeWidth="2" />
          <rect x="55" y="50" width="130" height="130" rx="2" fill="none" stroke="#5a4e3e" strokeWidth="2" />
          <rect x="62" y="57" width="54" height="116" rx="1" fill="#dceef8" stroke="#b0a494" strokeWidth="0.8" />
          <rect x="124" y="57" width="54" height="116" rx="1" fill="#dceef8" stroke="#b0a494" strokeWidth="0.8" />
          <rect x="170" y="100" width="4" height="16" rx="2" fill="#b0a494" />
          <path d="M48 180 L50 186 L190 186 L192 180 Z" fill="#d6cbb8" stroke="#b0a494" strokeWidth="1" />
          <line x1="30" y1="16" x2="210" y2="16" stroke="#7a6344" strokeWidth="1" strokeDasharray="4 2" />
          <polygon points="33,16 38,13 38,19" fill="#7a6344" /><polygon points="207,16 202,13 202,19" fill="#7a6344" />
          <circle cx="120" cy="16" r="10" fill="#fff" stroke="#7a6344" strokeWidth="1" strokeDasharray="2 1" />
          <text x="120" y="20" textAnchor="middle" fontSize="11" fill="#7a6344" fontWeight="600">D</text>
          <line x1="42" y1="30" x2="42" y2="186" stroke="#7a6344" strokeWidth="1" strokeDasharray="4 2" />
          <polygon points="42,33 39,38 45,38" fill="#7a6344" /><polygon points="42,183 39,178 45,178" fill="#7a6344" />
          <circle cx="42" cy="108" r="10" fill="#fff" stroke="#7a6344" strokeWidth="1" strokeDasharray="2 1" />
          <text x="42" y="112" textAnchor="middle" fontSize="11" fill="#7a6344" fontWeight="600">B</text>
          <line x1="42" y1="186" x2="42" y2="280" stroke="#7a6344" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.4" />
        </svg>
      </div>
      <p style={{ fontSize: 10, color: "#b0a494", textAlign: "center" }}>D = 窗帘杆总宽 &nbsp; B = 杆至地面/窗台高度</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// 主应用 —— 左图预览 + 右侧配置面板
// ═══════════════════════════════════════════════════════

export default function CurtainVisionApp() {
  const isMobile = useIsMobile();

  // ——— 窗户照片 ———
  const [windows, setWindows] = useState([]);
  const [windowPhoto, setWindowPhoto] = useState(null);
  const [photoLabel, setPhotoLabel] = useState("");
  const fileRef = useRef();

  // ——— 配置 ———
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [pleatMultiplier, setPleatMultiplier] = useState(2);
  const [lengthType, setLengthType] = useState("floor");
  const [arrangement, setArrangement] = useState("double");

  // ——— 生成 ———
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);

  // ——— 左侧图片切换（原图 vs AI结果） ———
  const [showOriginal, setShowOriginal] = useState(false);

  // ——— 订单（生图后展开） ———
  const [showOrder, setShowOrder] = useState(false);
  const [orderWidth, setOrderWidth] = useState("");
  const [orderHeight, setOrderHeight] = useState("");
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderNotes, setOrderNotes] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderError, setOrderError] = useState(null);

  // 加载窗户列表
  useEffect(() => {
    fetch(API_BASE + "/api/windows")
      .then((r) => r.json())
      .then((data) => setWindows(data.windows || []))
      .catch(() => {});
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
    setWindowPhoto({ previewUrl: localUrl, githubUrl: null, filename: file.name, isManual: true });
    setResultUrl(null);
    setShowOrder(false);
    setShowOriginal(false);
  };

  const canGenerate = !!(windowPhoto?.githubUrl && selectedStyle && !generating);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setError(null);
    setProgress(0);
    setStatusText("正在提交任务...");
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
      setTimeout(() => setStatusText("AI 正在分析窗户结构..."), 2000);
      setTimeout(() => setStatusText("正在生成纱帘效果..."), 6000);
      setTimeout(() => setStatusText("优化细节中，即将完成..."), 12000);

      const formData = new FormData();
      formData.append("style", selectedStyle.id);
      formData.append("window_url", windowPhoto.githubUrl);
      formData.append("pleat_multiplier", String(pleatMultiplier));
      formData.append("length_type", lengthType);
      formData.append("fabric_category", selectedStyle.categoryId || "");
      formData.append("arrangement", arrangement);

      const resp = await fetch(`${API_BASE}/api/generate`, { method: "POST", body: formData });
      clearInterval(progressTimer);

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || errData.error || "服务器错误 (" + resp.status + ")");
      }
      const data = await resp.json();
      if (data.success) {
        setProgress(100);
        setStatusText("生成完成！");
        setTimeout(() => { setGenerating(false); setResultUrl(API_BASE + data.result_url); }, 600);
      } else {
        throw new Error(data.error || "生成失败");
      }
    } catch (e) {
      setGenerating(false);
      setError(e.message);
    }
  };

  // 报价
  const basePrice = 1980;
  const wNum = parseFloat(orderWidth || "0");
  const hNum = parseFloat(orderHeight || "0");
  const areaFactor = !wNum || !hNum ? 1 : Math.max((wNum / 100) * (hNum / 260), 1);
  const pleatFactor = pleatMultiplier / 2;
  const totalPrice = Math.round(basePrice * areaFactor * pleatFactor * Number(orderQuantity || 1));

  const handleCheckout = async () => {
    if (!resultUrl) { setOrderError("请先完成效果图生成"); return; }
    setOrderSubmitting(true); setOrderError(null);
    try {
      const payload = {
        windowPhoto, photoLabel, style: selectedStyle,
        config: { pleatMultiplier, lengthType, arrangement, width: orderWidth, height: orderHeight, quantity: orderQuantity, notes: orderNotes },
        pricing: { basePrice, totalPrice, currency: "CNY" }, resultUrl, createdAt: new Date().toISOString(),
      };
      const resp = await fetch(`${API_BASE}/api/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!resp.ok) { const d = await resp.json().catch(() => ({})); throw new Error(d.detail || d.error || "提交失败"); }
      setOrderSubmitted(true);
    } catch (e) { setOrderError(e.message); }
    finally { setOrderSubmitting(false); }
  };

  // 样式
  const sectionLabel = { fontSize: 12, fontWeight: 600, color: "#5a4e3e", marginBottom: 6, marginTop: 14 };
  const btnPrimary = {
    padding: "10px 24px", borderRadius: 22, border: "none",
    background: "linear-gradient(135deg, #7a6344, #9e8564)",
    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
    boxShadow: "0 3px 12px rgba(122,99,68,0.25)", transition: "opacity 0.2s", width: "100%",
  };

  // ——— 左侧内容渲染 ———
  const leftContent = () => {
    // 生成中动画
    if (generating) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 400 }}>
          <div style={{
            width: 64, height: 64, marginBottom: 20, borderRadius: 16,
            background: "linear-gradient(135deg, #7a6344, #9e8564)",
            display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 2s infinite",
          }}><span style={{ fontSize: 28 }}>🎨</span></div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#3a3022", marginBottom: 14 }}>AI 正在创作中...</h3>
          <div style={{ width: "80%", maxWidth: 360 }}>
            <ProgressBar progress={progress} status={statusText} />
          </div>
        </div>
      );
    }

    // 有结果图：支持原图/效果图切换
    if (resultUrl) {
      const displayUrl = showOriginal ? windowPhoto?.previewUrl : resultUrl;
      const displayLabel = showOriginal ? "原始照片" : "AI 效果图";
      return (
        <div style={{ position: "relative" }}>
          <img src={displayUrl} alt={displayLabel} style={{ width: "100%", borderRadius: 12, display: "block", boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }} />
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.55)", color: "#fff", padding: "4px 10px", borderRadius: 8, fontSize: 11 }}>
            {displayLabel}
          </div>
          {/* 切换按钮：原图 ↔ 效果图 */}
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            style={{
              position: "absolute", top: 10, right: 10,
              background: "rgba(255,255,255,0.92)", color: "#5a4e3e",
              border: "1px solid #d6cbb8", borderRadius: 8,
              padding: "5px 10px", fontSize: 11, fontWeight: 500,
              cursor: "pointer", backdropFilter: "blur(4px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a4e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {showOriginal ? "查看效果图" : "查看原图"}
          </button>
          {/* 下载按钮 */}
          <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
            <a href={resultUrl} download={"curtain_" + (selectedStyle?.id || "") + ".png"} style={{ textDecoration: "none" }}>
              <button style={{ ...btnPrimary, width: "auto", padding: "8px 20px", fontSize: 12 }}>下载效果图</button>
            </a>
          </div>
        </div>
      );
    }

    // 有窗户照片：显示预览 + 更换按钮
    if (windowPhoto) {
      return (
        <div style={{ position: "relative" }}>
          <img src={windowPhoto.previewUrl} alt="窗户" style={{ width: "100%", borderRadius: 12, display: "block", boxShadow: "0 6px 24px rgba(0,0,0,0.08)" }} />
          <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.45)", color: "#fff", padding: "4px 10px", borderRadius: 8, fontSize: 11 }}>
            {photoLabel || windowPhoto.filename}
          </div>
          {/* 更换照片按钮 */}
          <button
            onClick={() => {
              // 重置照片，回到选择界面
              setWindowPhoto(null);
              setResultUrl(null);
              setShowOrder(false);
            }}
            style={{
              position: "absolute", bottom: 12, right: 12,
              background: "rgba(255,255,255,0.9)", color: "#5a4e3e",
              border: "1px solid #d6cbb8", borderRadius: 10,
              padding: "6px 14px", fontSize: 12, fontWeight: 500,
              cursor: "pointer", backdropFilter: "blur(4px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a4e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            更换照片
          </button>
          {windowPhoto?.isManual && (
            <div style={{
              position: "absolute", bottom: 12, left: 12,
              background: "rgba(255,248,232,0.95)", color: "#b08a2a",
              padding: "4px 10px", borderRadius: 6, fontSize: 10,
            }}>
              自定义照片仅可预览，需推送 GitHub 后方可生图
            </div>
          )}
        </div>
      );
    }

    // 空状态：上传/选择照片
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
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "#5a4e3e" }}>选择窗户照片</p>
        <p style={{ fontSize: 12, marginBottom: 16, color: "#b0a494" }}>从预设场景中选择，或上传您的窗户照片</p>

        {/* 预设窗户照片网格 */}
        {windows.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            {windows.map((w) => (
              <div key={w.filename} onClick={() => handleWindowSelect(w)}
                style={{
                  width: 80, height: 60, borderRadius: 8, overflow: "hidden", cursor: "pointer",
                  border: "2px solid transparent",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  transition: "all 0.15s",
                }}>
                <img src={w.preview_url} alt={w.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}

        {/* 上传按钮 */}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleManualUpload(e.target.files[0])} />
        <button onClick={() => fileRef.current?.click()} style={{
          padding: "8px 20px", borderRadius: 16, border: "1px dashed #c0b49e",
          background: "rgba(255,255,255,0.7)", color: "#7a6e5e", fontSize: 12, fontWeight: 500,
          cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7a6e5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          上传自定义照片
        </button>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ═══ 顶部 ═══ */}
      <header style={{ padding: isMobile ? "12px 16px" : "14px 32px", borderBottom: "1px solid rgba(122,99,68,0.08)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700, color: "#3a3022", margin: 0 }}>
            帘想 <span style={{ fontWeight: 300, color: "#9a8e7e", fontSize: isMobile ? 12 : 14 }}>CurtainVision</span>
          </h1>
        </div>
      </header>

      {/* ═══ 主体：左图预览 + 右配置 ═══ */}
      <main style={{
        maxWidth: 1200, margin: "0 auto",
        padding: isMobile ? "16px" : "24px 32px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 16 : 28,
        alignItems: "flex-start",
      }}>
        {/* ——— 左侧大图区 ——— */}
        <div style={{
          flex: "1 1 0", minWidth: 0,
          position: isMobile ? "relative" : "sticky",
          top: isMobile ? undefined : 24,
        }}>
          {leftContent()}
        </div>

        {/* ——— 右侧配置面板 ——— */}
        <div style={{
          width: isMobile ? "100%" : 320, flexShrink: 0,
          background: "rgba(255,255,255,0.85)", borderRadius: 16,
          padding: isMobile ? 16 : 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          border: "1px solid #e8e0d2",
          maxHeight: isMobile ? "none" : "calc(100vh - 100px)",
          overflowY: "auto",
        }}>

          {/* —— 1. 场景照片（仅缩略图 + 备注） —— */}
          <div style={sectionLabel}>场景照片</div>
          {windowPhoto ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", background: "rgba(122,99,68,0.04)", borderRadius: 10,
            }}>
              <img src={windowPhoto.previewUrl} alt="" style={{ width: 40, height: 30, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
              <input
                type="text" value={photoLabel} onChange={(e) => setPhotoLabel(e.target.value)}
                placeholder="添加备注（如：客厅、卧室）"
                style={{ flex: 1, padding: "4px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 11, background: "#fff" }}
              />
            </div>
          ) : (
            <p style={{ fontSize: 11, color: "#b0a494", padding: "8px 0" }}>请在左侧选择或上传窗户照片</p>
          )}

          {/* —— 2. 面料 —— */}
          <div style={sectionLabel}>面料 & 款式</div>
          <FabricSelector selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />

          {selectedStyle && (
            <p style={{ fontSize: 11, color: "#5a4e3e", marginTop: 6, background: "rgba(122,99,68,0.04)", padding: "4px 8px", borderRadius: 6 }}>
              已选：{selectedStyle.categoryName}
            </p>
          )}

          {/* —— 3. 窗帘布置 —— */}
          <div style={sectionLabel}>窗帘布置</div>
          <ArrangementSelector value={arrangement} onChange={setArrangement} />

          {/* —— 4. 褶皱 —— */}
          <div style={sectionLabel}>褶皱倍数</div>
          <PleatSelector value={pleatMultiplier} onChange={setPleatMultiplier} />

          {/* —— 5. 长度 —— */}
          <div style={sectionLabel}>纱帘长度</div>
          <LengthSelector value={lengthType} onChange={setLengthType} />

          {/* —— 错误提示 —— */}
          {error && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "#fff5f5", border: "1px solid #fcc", borderRadius: 8, color: "#c0392b", fontSize: 12 }}>
              {error}
            </div>
          )}

          {/* —— 生成按钮 —— */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            style={{
              ...btnPrimary, marginTop: 16,
              opacity: canGenerate ? 1 : 0.45,
              cursor: canGenerate ? "pointer" : "not-allowed",
            }}
          >
            {generating ? "生成中..." : "AI 生成效果图"}
          </button>

          {!windowPhoto && <p style={{ fontSize: 10, color: "#b0a494", textAlign: "center", marginTop: 6 }}>请先选择窗户照片和面料款式</p>}
          {windowPhoto && !selectedStyle && <p style={{ fontSize: 10, color: "#b0a494", textAlign: "center", marginTop: 6 }}>请选择面料款式</p>}

          {/* —— 自定义 & 下单按钮（生图完成后显示） —— */}
          {resultUrl && !showOrder && (
            <button
              onClick={() => setShowOrder(true)}
              style={{
                width: "100%", marginTop: 8, padding: "10px 24px", borderRadius: 22,
                border: "1.5px solid #7a6344", background: "transparent",
                color: "#7a6344", fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              自定义 & 下单
            </button>
          )}

          {/* ═══ 生图后：自定义尺寸 & 报价（展开） ═══ */}
          {showOrder && resultUrl && (
            <div style={{ marginTop: 12, paddingTop: 14, borderTop: "1px solid #e4dacb", animation: "fadeUp 0.3s ease" }}>
              {/* 折叠按钮 */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#3a3022" }}>自定义 & 下单</span>
                <button onClick={() => setShowOrder(false)} style={{
                  background: "none", border: "none", color: "#b0a494", fontSize: 16, cursor: "pointer", padding: "2px 6px",
                }}>×</button>
              </div>

              <div style={{ ...sectionLabel, marginTop: 0 }}>尺寸</div>
              <DimensionInput width={orderWidth} height={orderHeight} onWidthChange={setOrderWidth} onHeightChange={setOrderHeight} />

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#8a7e6e", marginBottom: 2 }}>数量（幅）</label>
                  <input type="number" min="1" value={orderQuantity} onChange={(e) => setOrderQuantity(Number(e.target.value || 1))}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 12 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#8a7e6e", marginBottom: 2 }}>滑轮类型</label>
                  <select style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 12, background: "#fff" }}>
                    <option value="standard">标准滑轮</option>
                    <option value="silent">静音滑轮</option>
                    <option value="heavy">重型滑轮</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <label style={{ display: "block", fontSize: 11, color: "#8a7e6e", marginBottom: 2 }}>备注</label>
                <textarea rows={2} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="如：希望偏暖白"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #d6cbb8", fontSize: 12, resize: "vertical" }} />
              </div>

              {/* 报价 */}
              <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 10, background: "linear-gradient(135deg, rgba(122,99,68,0.06), rgba(158,133,100,0.08))", fontSize: 12, color: "#3a3022" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span>参考单价</span><span>¥{basePrice}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span>尺寸系数</span><span>×{areaFactor.toFixed(2)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span>褶皱系数</span><span>×{pleatFactor.toFixed(2)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 3, paddingTop: 3, borderTop: "1px solid rgba(122,99,68,0.1)" }}>
                  <span>预估总价</span><span>¥{totalPrice.toLocaleString("zh-CN")}</span>
                </div>
              </div>

              {orderError && <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 6, background: "#fff5f5", border: "1px solid #f5c2c0", color: "#b1261a", fontSize: 11 }}>{orderError}</div>}
              {orderSubmitted && <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 6, background: "#f0fff4", border: "1px solid #9ae6b4", color: "#276749", fontSize: 11 }}>配置已提交，我们会尽快联系您。</div>}

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={handleCheckout} disabled={orderSubmitting}
                  style={{ ...btnPrimary, flex: 1, opacity: orderSubmitting ? 0.7 : 1 }}>
                  {orderSubmitting ? "提交中..." : "提交方案"}
                </button>
                <a href={resultUrl} download={"curtain_" + (selectedStyle?.id || "") + ".png"} style={{ textDecoration: "none", flex: 1 }}>
                  <button style={{
                    width: "100%", padding: "10px 24px", borderRadius: 22,
                    border: "1.5px solid #7a6344", background: "transparent",
                    color: "#7a6344", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>保存效果图</button>
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: 16, color: "#b8ad9c", fontSize: 10, borderTop: "1px solid rgba(122,99,68,0.06)", marginTop: 24 }}>
        帘想 CurtainVision © 2026
      </footer>
    </div>
  );
}
