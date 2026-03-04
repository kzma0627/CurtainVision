# CLAUDE.md — CurtainVision / 帘想

> 新会话开始前请先通读。详细版本历史见 `CHANGELOG.md`。

---

## 项目概述

**帘想 CurtainVision** — 面向日内瓦法语区的定制纱帘电商（品牌名 La Voilerie）。
- CHF 9.5 成本 → CHF 119 售价
- 核心功能：用户上传/选择窗户照片 → 选面料/款式/布置/褶皱/长度 → AI 渲染效果图 → 加入购物车/下单

**开发者**：Kaiyue，日内瓦，有中国供应商和家庭物流网络。

---

## 当前版本：v5.0

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + Vite, 模块化组件, react-i18next (FR/DE/EN/ZH), 纯 inline style |
| 后端 | FastAPI + SQLite + JWT auth, Python 3.11 |
| AI 生图 | Replicate API (`google/nano-banana-2`) |
| 预设图 | GitHub public raw URL |
| 用户上传 | `io.BytesIO` 直传 Replicate SDK（无需外部存储）|
| 订单 | Airtable API（单条 + 批量）|
| 认证 | Google OAuth + JWT, Apple 待实现 |

---

## 目录结构

```
D:\CurtainVision\
├── backend\
│   ├── main.py              ← FastAPI v5.0
│   ├── database.py          ← SQLite init (users + generation_logs)
│   ├── auth.py              ← JWT + get_or_create_user
│   ├── rate_limiter.py      ← guest/user 限制
│   ├── .env                 ← 密钥（勿 git add）
│   ├── outputs\             ← AI 生成图
│   └── venv\                ← 虚拟环境（勿 git add）
├── frontend\src\
│   ├── App.jsx              ← 主 shell (~525 行)
│   ├── main.jsx             ← 入口 (AuthProvider > CartProvider > App)
│   ├── index.css            ← 全局样式
│   ├── data\fabrics.js      ← FABRIC_CATEGORIES, PLEAT/ARRANGEMENT_OPTIONS
│   ├── hooks\useIsMobile.js
│   ├── utils\pricing.js     ← CHF 119 基准价
│   ├── utils\api.js         ← fetch 封装
│   ├── contexts\CartContext.jsx   ← 购物车 + localStorage
│   ├── contexts\AuthContext.jsx   ← JWT + guestUUID + 限频检查
│   ├── i18n\index.js        ← i18next 配置 (fallback: fr)
│   ├── i18n\{fr,de,en,zh}.json
│   └── components\          ← FabricSelector, PleatSelector, ArrangementSelector,
│                               LengthSelector, ProgressBar, DimensionInput,
│                               LanguageSelector, CartDrawer, AuthModal
├── resources\curtain\       ← 面料图 (sheerSolar/Privacy/Durable, -1=详情 -2=缩略)
├── resources\windows\       ← 预设窗户照片 1~6.jpg
├── CLAUDE.md                ← 本文件
└── CHANGELOG.md             ← 版本迭代历史
```

---

## 后端 API

```
GET  /api/health                   健康检查
GET  /api/windows                  预设窗户列表
GET  /api/styles                   面料款式列表
POST /api/generate                 AI 生图（支持 URL 或文件上传）
POST /api/orders                   提交订单（单条或批量）
POST /api/auth/google              Google OAuth 登录
GET  /api/auth/me                  获取当前用户
GET  /api/rate-limit/status        频率限制状态
```

**`/api/generate` 参数（Form）：**
`style`, `window_url` (可选), `window_file` (可选 UploadFile), `pleat_multiplier`, `length_type`, `fabric_category`, `arrangement`, `guest_uuid`

**Prompt 策略（`build_prompt()`）：** 简短精练 ~100 词，只有一个 CRITICAL（轨道位置+长度合并），避免多个 CRITICAL 竞争模型注意力。

---

## 前端关键模式

- 所有 UI 文字用 `t("key")` (react-i18next)，数据常量用 `nameKey`/`labelKey`
- 字体：Latin-first + CJK fallback
- 配色：`#7a6344` 主色, `#9e8564` 辅色, `#3a3022` 文字
- 桌面左右分栏（左 sticky 预览 + 右 320px 配置），移动端上下堆叠（768px 断点）
- 购物车：CartContext + localStorage，File 对象不序列化
- 认证：guestUUID (`cv_guest_uuid`) + JWT (`cv_auth_token`)

---

## 环境变量（`backend/.env`）

```
REPLICATE_API_TOKEN=r8_xxxxx
AIRTABLE_API_KEY=patxxxxx
AIRTABLE_BASE_ID=appxxxxx
AIRTABLE_TABLE_ID=Orders
JWT_SECRET=xxx (可选, 默认 dev-secret)
GOOGLE_CLIENT_ID=xxx (Google OAuth)
```

---

## 启动方式

```bash
# 后端
cd D:\CurtainVision\backend
venv\Scripts\python.exe main.py    # → http://localhost:8000

# 前端
cd D:\CurtainVision\frontend
npm run dev                         # → http://localhost:5173
```

---

## 限频配置（`rate_limiter.py`）

- Guest: `GUEST_LIMIT = 999`（开发），生产改为 3
- 注册用户: 10次/小时, 30次/天

---

## 已知问题

- `sheerPrivacy1- 2.png` 文件名有空格（历史遗留）
- Apple OAuth 待实现（需 Apple Developer 账号）
- Google OAuth 需 `GOOGLE_CLIENT_ID` + `index.html` 引入 GSI script

---

## 下一步计划

- [ ] 生图质量持续优化（prompt 调优、模型选型）
- [ ] 订单管理后台
- [ ] 部署到云端
- [ ] Apple OAuth
