# CLAUDE.md — CurtainVision / 帘想 项目上下文

> 给未来的 Claude（或任何接手的 AI / 开发者）读的。新会话开始前请先通读这份文档。

---

## 项目概述

**帘想 CurtainVision** — 面向日内瓦法语区市场的定制窗帘电商（品牌名 La Voilerie），核心差异化：
- 从中国供应商采购纱帘，CHF 9.5 成本 → CHF 119 售价
- **CurtainVision AI 配置器**：用户上传/选择窗户照片 → 选面料/款式/布置/褶皱/长度 → AI 实时渲染窗帘效果图 → 下单

**开发者**：Kaiyue，住日内瓦，技术背景强，有中国供应商和家庭物流网络。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 (JSX) + Vite 7.3，纯 inline style，无 CSS 框架 |
| 后端 | FastAPI + uvicorn，Python 3.11 |
| AI 生图 | Replicate API，模型 `google/nano-banana` |
| 图片存储 | GitHub public raw URL（Replicate 需要公开可访问的 URL）|
| 订单存储 | Airtable API |
| 开发环境 | Windows，PowerShell，本地开发 |

---

## 目录结构

```
D:\CurtainVision\
├── backend\
│   ├── main.py              ← FastAPI 后端（当前 v4.0）
│   ├── .env                 ← REPLICATE_API_TOKEN + AIRTABLE_* keys（永远不要 git add）
│   ├── outputs\             ← AI 生成图片保存目录
│   └── venv\                ← Python 虚拟环境（永远不要 git add）
├── frontend\
│   ├── src\
│   │   ├── App.jsx          ← React 主组件（当前 v4.0，~560 行）
│   │   ├── index.css        ← 全局样式 reset + 动画关键帧
│   │   └── main.jsx         ← React 入口
│   ├── package.json
│   └── vite.config.js
├── resources\
│   ├── curtain\             ← 面料参考图（sheerSolar/Privacy/Durable 系列）
│   └── windows\             ← 窗户预设照片 1.jpg~6.jpg
├── .claude\
│   └── launch.json          ← Claude Preview 启动配置
├── .gitignore               ← 包含 .env, backend/venv/, __pycache__, node_modules
└── CLAUDE.md                ← 本文件
```

---

## GitHub 仓库

```
https://github.com/kzma0627/CurtainVision
```

**重要 URL 模式（Replicate API 调用依赖这些公开 URL）：**
- 窗户图：`https://raw.githubusercontent.com/kzma0627/CurtainVision/main/resources/windows/{filename}`
- 面料参考图：`https://raw.githubusercontent.com/kzma0627/CurtainVision/main/resources/curtain/{filename}`

---

## 当前版本：v4.0（中文 AI 配置器）

### 核心 UI 布局

**桌面端：左右分栏**
- 左侧：粘性大图预览区（`position: sticky`），宽度自适应
- 右侧：固定 320px 配置面板，可滚动

**移动端（≤768px）：上下堆叠**
- 上方大图，下方配置面板

**全站中文界面**，配色以暖棕（`#7a6344`）为主调。

### 前端架构（App.jsx）

**组件结构：**
```
CurtainVisionApp（主组件）
├── 左侧预览区（4 种状态）
│   ├── 空白态：窗户照片网格 + 上传按钮
│   ├── 已选窗户：大图预览 + "更换照片" 按钮
│   ├── 生成中：动画 + 进度条
│   └── 有结果：效果图 + 原图/效果图切换按钮 + 下载
├── FabricSelector（面料选择器，内联实拍图展开）
├── ArrangementSelector（窗帘布置：双开/左单开/右单开）
├── PleatSelector（褶皱倍数：1.5x/2x/2.5x）
├── LengthSelector（长度：垂至地面/覆盖窗户，含 SVG 图解）
├── ProgressBar（生成进度）
└── DimensionInput（尺寸输入 + 线稿图，含 D/B 标注 SVG）
```

**关键 state：**
```js
windowPhoto      // {previewUrl, githubUrl, filename, isManual?}
selectedStyle    // {id, thumbnail, detail, ref, categoryId, categoryName}
pleatMultiplier  // 1.5 | 2 | 2.5
lengthType       // "floor" | "windowsill"
arrangement      // "double" | "left" | "right"
generating       // boolean
resultUrl        // string | null
showOriginal     // boolean（结果图时切换原图/效果图）
showOrder        // boolean（展开下单面板）
```

**面料数据结构：**
```js
const FABRIC_CATEGORIES = [
  { id: "sheerSolar",   name: "阳光纱", styles: [sheerSolar1, sheerSolar2, sheerSolar3] },
  { id: "sheerPrivacy", name: "隐私纱", styles: [sheerPrivacy1, sheerPrivacy2] },
  { id: "sheerDurable", name: "耐用纱", styles: [sheerDurable1] },
];
// 每个 style: { id, thumbnail: "-2" 后缀, detail: "-1" 后缀, ref: "-1" 后缀 }
```

**面料选择交互：**
- 点击缩略图 = 选中该款式 + 在缩略图下方内联展开实拍大图
- 没有"详情"文字按钮，直接点缩略图即触发
- 切换款式时自动折叠旧的、展开新的

**生图后交互：**
- 左侧：右上角有"查看原图/查看效果图"切换按钮
- 右侧："AI 生成效果图"按钮下方出现"自定义 & 下单"按钮
- 点击"自定义 & 下单"展开：尺寸输入（SVG 线稿图）+ 滑轮类型 + 数量 + 备注 + 实时报价 + 提交/保存

### 后端架构（main.py）

**核心端点：**
```
GET  /api/health          健康检查
GET  /api/windows         返回 resources/windows/ 的图片列表（含 github_url）
GET  /api/styles          面料款式列表
POST /api/generate        主 AI 生图接口
POST /api/orders          提交订单到 Airtable
GET  /api/debug/urls      URL 可访问性检查
POST /api/debug/dry-run   不调用 Replicate 的参数验证
```

**静态文件路由：**
```
/resources/*  →  ../resources/curtain/
/windows/*    →  ../resources/windows/
/outputs/*    →  outputs/
```

**生成接口 `/api/generate` 参数：**
```
style:            款式 ID（sheerSolar1, sheerPrivacy2 等）
window_url:       窗户照片的 GitHub raw URL
pleat_multiplier: 褶皱倍数 (1.5 / 2.0 / 2.5)
length_type:      长度类型 ("floor" / "windowsill")
fabric_category:  面料类目 ("sheerSolar" / "sheerPrivacy" / "sheerDurable")
arrangement:      窗帘布置 ("double" / "left" / "right")
```

**Prompt 构建策略（`build_prompt()` 函数）：**
按优先级从高到低拼接：
1. 基础指令（保持房间不变，只加窗帘）
2. **长度约束**（CRITICAL 前缀，最重要）
3. **布置描述**（双开/左开/右开）
4. 面料类型描述
5. 褶皱描述
6. 画质后缀（Photorealistic, 8k）

**Replicate 调用方式：**
```python
output = replicate.run("google/nano-banana", input={
    "prompt": prompt,
    "image_input": [window_url] + ref_urls,  # 窗户图 + 面料参考图
})
```
生成结果下载保存到 `outputs/result_{uuid}.png`。

**款式 → 参考图映射（`CURTAIN_STYLES`）：**
```python
{
    "sheerSolar1":  {"refs": ["sheerSolar1-1.jpg"],  "category": "sheerSolar"},
    "sheerSolar2":  {"refs": ["sheerSolar2-1.jpg"],  "category": "sheerSolar"},
    "sheerSolar3":  {"refs": ["sheerSolar3-1.jpg"],  "category": "sheerSolar"},
    "sheerPrivacy1": {"refs": ["sheerPrivacy1-1.png"], "category": "sheerPrivacy"},
    "sheerPrivacy2": {"refs": ["sheerPrivacy2-1.png"], "category": "sheerPrivacy"},
    "sheerDurable1": {"refs": ["sheerDurable1-1.png"], "category": "sheerDurable"},
}
```

---

## 面料资源文件

**存放目录：** `resources/curtain/`

**命名规范：** `{category}{number}-{1|2}.{ext}`
- `-1` = 实拍/详情大图（也用作 Replicate 参考图）
- `-2` = 缩略图/色卡

**当前文件清单：**
```
sheerSolar1-1.jpg, sheerSolar1-2.jpg    # 阳光纱款式一
sheerSolar2-1.jpg, sheerSolar2-2.jpg    # 阳光纱款式二
sheerSolar3-1.jpg, sheerSolar3-2.jpg    # 阳光纱款式三
sheerSolar4-1.jpg, sheerSolar4-2.jpg    # 阳光纱款式四（未在前端启用）
sheerSolar5-1.jpg, sheerSolar5-2.jpg    # 阳光纱款式五（未在前端启用）
sheerPrivacy1-1.png, sheerPrivacy1- 2.png  # 隐私纱款式一（注意: -2 文件名有空格！）
sheerPrivacy2-1.png, sheerPrivacy2-2.png   # 隐私纱款式二
sheerDurable1-1.png, sheerDurable1-2.png   # 耐用纱款式一
```

**⚠️ 已知问题：** `sheerPrivacy1- 2.png` 文件名中有空格（应为 `sheerPrivacy1-2.png`），前端代码引用的是不带空格的版本，如需使用需重命名。

**窗户预设照片：** `resources/windows/1.jpg ~ 6.jpg`

---

## 定价逻辑（前端计算）

```javascript
basePrice = 1980  // 元（CNY 基准价）
areaFactor = max((width / 100) * (height / 260), 1)
pleatFactor = pleatMultiplier / 2
totalPrice = basePrice × areaFactor × pleatFactor × quantity
```

---

## 环境变量（`.env` 文件，位于 backend/ 目录）

```
REPLICATE_API_TOKEN=r8_xxxxx
AIRTABLE_API_KEY=patxxxxx
AIRTABLE_BASE_ID=appxxxxx
AIRTABLE_TABLE_ID=Orders
```

---

## 启动方式

```bash
# 后端
cd D:\CurtainVision\backend
venv\Scripts\activate
python main.py
# → http://localhost:8000

# 前端
cd D:\CurtainVision\frontend
npm run dev
# → http://localhost:5173
```

**Claude Preview 启动配置（`.claude/launch.json`）：**
```json
{
  "configurations": [{
    "name": "frontend",
    "runtimeExecutable": "node",
    "runtimeArgs": ["node_modules/vite/bin/vite.js", "--port", "5173", "--host"],
    "cwd": "frontend",
    "port": 5173
  }]
}
```

---

## 曾经踩过的坑

1. **Replicate Files API** 返回的 URL 需要 Authorization header，Replicate 模型调用时无法携带 → 改用 GitHub public raw URL
2. **`.env` 泄露**：先 `git add` 再写 `.gitignore`，token 进入 git 历史 → `git filter-branch` 清除 + 撤销旧 token
3. **`backend/venv/`** 被追踪进 git → `git rm -r --cached backend/venv/` 清理
4. **PowerShell 没有 grep** → 用 `findstr` 代替
5. **字段命名不一致**：后端返回 `github_url`（下划线），前端写成 `githubUrl`（驼峰）→ 导致生成按钮灰色
6. **新面料文件 404**：添加了 sheer* 文件到本地但未 push 到 GitHub → Replicate 调用时找不到参考图
7. **worktree 与主仓库文件不同步**：worktree 有旧的数字命名文件（1-2.jpg），主仓库有新的 sheer 命名 → 需要手动复制
8. **前后端参数不匹配导致 422**：v3 前端发送 `orientation, collection, fabric_label, plissage`，v4 后端期望 `style, pleat_multiplier, length_type, fabric_category` → 需要前后端同步更新
9. **`.env` 在 worktree 中缺失**：worktree 是独立目录，`.env` 不会自动复制 → `load_dotenv()` 加了双路径尝试
10. **Preview viewport 限制**：Claude Preview 默认 viewport 650px 宽度，触发移动端布局 → 用 `--host` 暴露后可用 `preview_resize` 或直接在浏览器查看

---

## 下一步计划（未实现）

- [ ] 注册墙 UI（Google/Apple OAuth）
- [ ] 真实购物车功能
- [ ] 生成质量优化（prompt 调优，试验不同模型，negative prompt）
- [ ] 订单管理后台
- [ ] 多语言支持（中/法/英）
- [ ] 部署到云端（目前仅本地开发）

---

## 版本迭代记录

### v0.1-mvp
最初 MVP 原型。

### v0.2-github-url
切换图片存储为 GitHub public raw URL 方案。

### v2.0
两阶段沉浸式流程（Stage 1 配置 + Stage 2 下单抽屉），串联生图（Fermé → Ouvert），法语界面。

### v3.0（AI Immersive Flow）
左右分栏布局，法语界面，旧面料体系（Éloïse/Groove/Flaxy），旧参数体系（orientation/collection/plissage）。

### v3.0 → v4.0 迭代清单

以下是从 v3.0 到 v4.0 的全部迭代内容，按时间顺序记录：

#### 迭代一：基础架构重构（7 项需求）

1. **响应式布局**：添加 `useIsMobile()` hook（768px 断点），桌面左右分栏、移动端上下堆叠
2. **全站中文化**：所有 UI 文本从法语改为中文
3. **面料体系重构**：
   - 删除旧的 Éloïse / Groove / Flaxy 三分类
   - 新建 sheerSolar（阳光纱，3 款）/ sheerPrivacy（隐私纱，2 款）/ sheerDurable（耐用纱，1 款）
   - 文件命名从数字（1-2.jpg）改为语义化（sheerSolar1-2.jpg）
   - `-2` 后缀 = 缩略图，`-1` 后缀 = 实拍详情图
4. **褶皱倍数选项**：新增 1.5x / 2x / 2.5x 三档褶皱倍数，影响生图 prompt
5. **长度选择**：垂至地面（floor）vs 覆盖窗户（windowsill），含 SVG 示意图，影响生图 prompt
6. **尺寸输入**：含窗帘线稿 SVG 图解（D = 宽，B = 高），用于下单报价
7. **场景备注**：照片可添加文本标签（如"客厅"、"卧室"）

#### 迭代二：布局从步骤向导改为左右分栏

用户反馈步骤向导流程不直观，要求改为：
- **左侧**：大图预览区（sticky 定位）
- **右侧**：320px 配置面板（可滚动）
- 同时改进 prompt：为长度约束添加 `CRITICAL:` 前缀和多句话强调，确保 AI 生图时准确体现垂至地面/到窗台的区别

#### 迭代三：5 项 UX 精细化

1. **照片上传移至左侧预览区**：
   - 空白态：预览区内显示预设窗户网格 + "上传自定义照片"按钮
   - 选定后：显示大图预览 + 右下角"更换照片"按钮（点击回到选择界面）
   - 右侧面板不再有照片网格和上传按钮

2. **右侧场景区简化**：
   - 仅保留小缩略图 + 备注输入框（"添加备注（如：客厅、卧室）"）
   - 未选照片时显示"请在左侧选择或上传窗户照片"提示

3. **面料详情内联展开**：
   - 删除原来的"详情"文字按钮
   - 点击缩略图 = 选中 + 在缩略图行下方展开实拍大图（带"阳光纱 实拍"标签）
   - 点击另一个款式自动切换展开

4. **新增窗帘布置选项**：
   - 三选一：双开 / 左单开 / 右单开
   - 每个选项有 SVG 示意图标
   - 后端新增 `ARRANGEMENT_PROMPTS` 字典和 `arrangement` 参数
   - 影响 AI 生图 prompt

5. **生成后 UX 优化**：
   - 左侧：右上角增加"查看原图/查看效果图"切换按钮（眼睛图标）
   - 右侧："AI 生成效果图"按钮下方出现"自定义 & 下单"按钮
   - 点击展开：尺寸输入（SVG 线稿图）+ 滑轮类型选择（标准/静音/重型）+ 数量 + 备注 + 实时报价 + "提交方案"/"保存效果图"双按钮
   - 可折叠关闭（× 按钮）

#### 后端对应变更

- `CURTAIN_STYLES` 从数字 ID 改为语义化 ID（sheerSolar1 等）
- 新增 `CATEGORY_PROMPTS`、`PLEAT_PROMPTS`、`LENGTH_PROMPTS`、`ARRANGEMENT_PROMPTS` 四个 prompt 字典
- `build_prompt()` 函数参数：`fabric_category, pleat_multiplier, length_type, arrangement`
- `/api/generate` 接口参数：`style, window_url, pleat_multiplier, length_type, fabric_category, arrangement`
- 新增 `/api/orders` 端点，将订单数据发送到 Airtable
- `.env` 加载双路径策略（脚本目录 + CWD）

---

*最后更新：2026-03-03，基于 v3.0 → v4.0 迭代会话，由 Claude Opus 4.6 整理*
