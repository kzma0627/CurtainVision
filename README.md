# 🪟 帘想 CurtainVision — MVP 快速搭建指南

> 用户上传窗户照片 → 选择纱帘款式 → AI 生成真实效果图

---

## 🏗️ 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 前端 | React (Vite) | 用户界面 |
| 后端 | Python FastAPI | API 服务 |
| AI | Replicate API (SDXL) | 图像生成，无需本地 GPU |

## 💰 费用

- Replicate SDXL: 每张图约 **$0.01 - $0.05**
- 新用户注册赠送免费额度，足够测试几十张

---

## 📋 准备工作（只需做一次）

### 1. 安装 Python 3.11+

- 下载: https://www.python.org/downloads/
- **安装时勾选 "Add Python to PATH"**
- 验证: 打开 CMD 输入 `python --version`

### 2. 安装 Node.js 20+

- 下载: https://nodejs.org/ (LTS 版本)
- 验证: `node --version`

### 3. 获取 Replicate API Key

1. 访问 https://replicate.com 注册账号
2. 进入 https://replicate.com/account/api-tokens
3. 点击 "Create token" 创建新密钥
4. **复制保存好这个密钥**（以 `r8_` 开头）

---

## 🚀 搭建步骤

### Step 1: 创建项目文件夹

```bash
mkdir D:\CurtainVision
cd D:\CurtainVision
```

把我给你的文件按以下结构放好：

```
D:\CurtainVision\
├── backend\
│   ├── main.py            ← 后端代码
│   ├── requirements.txt   ← Python 依赖
│   └── .env               ← API 密钥（需要你自己创建）
└── frontend\
    └── (下面会用命令自动生成)
```

### Step 2: 配置后端

```bash
cd D:\CurtainVision\backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

创建 `.env` 文件（复制 `.env.example` 并填入你的密钥）：

```bash
copy .env.example .env
```

然后用记事本打开 `.env`，把 `r8_你的API密钥粘贴在这里` 替换为你在 Replicate 获取的真实 API Token。

### Step 3: 启动后端

```bash
cd D:\CurtainVision\backend
venv\Scripts\activate
python main.py
```

看到以下输出说明成功：
```
==================================================
  CurtainVision API 启动中...
  API 文档: http://localhost:8000/docs
==================================================
```

**验证：** 浏览器打开 http://localhost:8000/api/health ，应该看到：
```json
{"status":"ok","replicate_configured":true}
```

### Step 4: 搭建前端

**新开一个 CMD 窗口**（后端窗口不要关）：

```bash
cd D:\CurtainVision

# 创建 Vite + React 项目
npm create vite@latest frontend -- --template react

cd frontend
npm install
npm install axios
```

然后把我给你的 `curtain-app.jsx` 文件内容替换到：
`D:\CurtainVision\frontend\src\App.jsx`

也就是说，删掉 `App.jsx` 里原来的内容，把 `curtain-app.jsx` 的全部内容粘贴进去。

### Step 5: 启动前端

```bash
cd D:\CurtainVision\frontend
npm run dev
```

看到类似输出：
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

### Step 6: 开始使用！

浏览器打开 **http://localhost:5173**

1. 上传一张窗户照片
2. 选择纱帘款式
3. 选择纱帘模式（拉上/半开/打开）
4. 点击 "AI 生成高清效果图"
5. 等待 15-30 秒，查看结果！

---

## 🛠️ 日常使用

每次使用需要启动两个服务（开两个 CMD 窗口）：

**窗口 1 - 后端：**
```bash
cd D:\CurtainVision\backend
venv\Scripts\activate
python main.py
```

**窗口 2 - 前端：**
```bash
cd D:\CurtainVision\frontend
npm run dev
```

或者使用一键启动脚本（见下方）。

---

## ⚡ 一键启动脚本

在 `D:\CurtainVision\` 下创建 `start.bat`：

```bat
@echo off
echo.
echo   ========================================
echo     帘想 CurtainVision 启动中...
echo   ========================================
echo.

:: 启动后端
start "CurtainVision-Backend" cmd /k "cd /d D:\CurtainVision\backend && venv\Scripts\activate && python main.py"

:: 等后端启动
timeout /t 4 /nobreak > nul

:: 启动前端
start "CurtainVision-Frontend" cmd /k "cd /d D:\CurtainVision\frontend && npm run dev"

:: 等前端启动
timeout /t 4 /nobreak > nul

:: 打开浏览器
start http://localhost:5173

echo.
echo   服务已全部启动！浏览器即将打开...
echo   按任意键关闭此窗口
pause > nul
```

以后双击 `start.bat` 就行了。

---

## ❓ 常见问题

### Q: `replicate_configured: false`
**A:** `.env` 文件中的 API Token 没有正确配置。确认 Token 以 `r8_` 开头，且没有多余空格。

### Q: 生成超时或报错 502
**A:** Replicate 首次调用 SDXL 模型需要"冷启动"（约 1-2 分钟），第二次就快了。如果持续失败，检查 Replicate 账户余额。

### Q: 前端打开空白
**A:** 确认已经正确替换了 `App.jsx` 的内容。打开浏览器开发者工具 (F12) 查看控制台报错。

### Q: 生成的图片窗户变形严重
**A:** 调整 `main.py` 中的 `prompt_strength` 参数（当前 0.55）。降低到 0.35-0.45 会更多保留原图结构。

### Q: 想要更好的效果
**A:** 这是 MVP 版本，使用的是基础 img2img。后续可以升级为：
- 使用 ControlNet（保持窗户结构不变）
- 使用 Inpainting（只在窗户区域添加纱帘）
- 迁移到本地 ComfyUI（RTX 5070 Ti 完全够用）

---

## 🗺️ 后续迭代路线

| 阶段 | 内容 | 预计时间 |
|------|------|----------|
| MVP ✅ | Replicate API + img2img | 现在 |
| V1.1 | 添加 ControlNet 保持窗户结构 | 1 周 |
| V1.2 | 迁移到本地 ComfyUI (5070Ti) | 2 周 |
| V2.0 | 用户系统 + 历史记录 + 多图对比 | 1 月 |
| V2.5 | 部署上线 + 域名 + 支付 | 1 月 |
