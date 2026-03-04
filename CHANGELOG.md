# CHANGELOG — CurtainVision 版本迭代记录

---

## v5.0 (2026-03-04)

### 新功能
- **多语言 i18n**：react-i18next，法语默认，支持德/英/中切换，所有 UI 文字覆盖
- **购物车**：CartContext + localStorage 持久化，CartDrawer 侧滑面板，批量提交到 Airtable
- **用户上传窗户照片**：`io.BytesIO` 直传 Replicate SDK，无需外部存储服务
- **注册 + 限频**：Google OAuth + JWT，SQLite 存储用户和生成日志，Guest 限频 + 注册用户限频
- **Prompt 精简**：从 ~300 词压缩到 ~100 词，合并轨道位置+长度为唯一 CRITICAL，去除 CATEGORY_PROMPTS（改为依赖参考图）

### 架构变更
- 前端模块化拆分：App.jsx 从 ~810 行 → ~525 行，提取 9 个组件 + 2 个 Context + 2 个 utils + 1 个 hook + 1 个 data 模块
- 后端新增 `database.py`, `auth.py`, `rate_limiter.py`
- 定价从 CNY 1980 → CHF 119（瑞士市场）
- 模型从 `google/nano-banana` → `google/nano-banana-2`（用户可在 main.py 切换）

### Bug 修复
- AuthModal 误弹出：rate-limit 404 时 `!undefined = true` → 改为 `allowed === false` 严格判断
- `window_file.size` 可能为 None → 改用 `window_file.filename` 判断
- `request.client` 可能为 None → 加 fallback `127.0.0.1`
- ModelError 错误信息为空 → 从 `e.prediction.error` + `e.prediction.logs` 提取详情

### 踩坑记录
- 老后端未重启导致前端发送新参数（`guest_uuid`, `window_file`）→ 422
- PowerShell 禁止运行 activate.ps1 → 用 `venv\Scripts\python.exe main.py` 绕过
- `nano-banana-2` 偶发 `httpx.ReadTimeout`（Replicate 内部 Gemini Flash 调用超时）
- Prompt 过长 + 多个 CRITICAL → 模型注意力分散，长度约束不被遵守

---

## v4.0 (2026-03-03)

### 从 v3.0 的变更

#### 迭代一：基础架构重构
1. 响应式布局：`useIsMobile()` hook（768px 断点），桌面左右分栏、移动端上下堆叠
2. 全站中文化：所有 UI 文本从法语改为中文
3. 面料体系重构：删除 Eloïse/Groove/Flaxy → 新建 sheerSolar(3款)/sheerPrivacy(2款)/sheerDurable(1款)
4. 褶皱倍数：1.5x/2x/2.5x 三档
5. 长度选择：floor vs windowsill，含 SVG 图解
6. 尺寸输入：含窗帘线稿 SVG（D=宽, B=高）
7. 场景备注：照片可添加文本标签

#### 迭代二：布局改为左右分栏
- 左侧 sticky 大图预览 + 右侧 320px 配置面板
- Prompt 为长度约束添加 CRITICAL 前缀

#### 迭代三：UX 精细化
1. 照片上传移至左侧预览区（空白态网格 + 上传按钮）
2. 右侧场景区简化（小缩略图 + 备注输入）
3. 面料详情内联展开（点缩略图即选中+展开实拍大图）
4. 新增窗帘布置选项（双开/左单开/右单开 + SVG 图标）
5. 生成后 UX（原图/效果图切换、自定义&下单面板）

#### 后端变更
- CURTAIN_STYLES 语义化 ID，四个 prompt 字典
- 新增 `/api/orders` → Airtable
- `.env` 双路径加载策略

---

## v3.0 — AI Immersive Flow

左右分栏布局，法语界面，旧面料体系（Eloïse/Groove/Flaxy），旧参数体系（orientation/collection/plissage）。

---

## v2.0

两阶段沉浸式流程（Stage 1 配置 + Stage 2 下单抽屉），串联生图（Fermé → Ouvert），法语界面。

---

## v0.2-github-url

切换图片存储为 GitHub public raw URL 方案。

---

## v0.1-mvp

最初 MVP 原型。

---

## 历史踩坑汇总

1. Replicate Files API URL 需 Auth header，模型无法携带 → 改用 GitHub raw URL
2. `.env` 泄露进 git 历史 → `git filter-branch` 清除 + 撤销旧 token
3. `backend/venv/` 被追踪 → `git rm -r --cached`
4. PowerShell 没有 grep → 用 `findstr`
5. 后端 `github_url` vs 前端 `githubUrl` 命名不一致 → 生成按钮灰色
6. 面料文件未 push → Replicate 404
7. worktree 与主仓库文件不同步
8. 前后端参数名不匹配 → 422
9. `.env` 在 worktree 中缺失
10. Preview viewport 650px 触发移动端布局
