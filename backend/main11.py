"""
CurtainVision MVP - Backend API
使用 Replicate API 调用 SDXL img2img 模型生成窗帘效果图
"""

import os
import uuid
import base64
import httpx
import replicate
from pathlib import Path
from io import BytesIO
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CurtainVision API", version="1.0.0")

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # MVP 阶段允许所有来源; 生产环境请改为具体域名
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 文件目录 ──────────────────────────────────────────
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── 纱帘款式 Prompt 配置 ─────────────────────────────
CURTAIN_STYLES = {
    "sheer-white": {
        "name": "白色薄纱帘",
        "prompt": "sheer white voile curtain, translucent lightweight fabric, soft diffused light filtering through, elegant minimal draping",
        "color_hint": "white, ivory",
    },
    "linen-beige": {
        "name": "亚麻米色纱帘",
        "prompt": "natural linen curtain in warm beige tone, organic textured woven fabric, casual elegant draping, cozy atmosphere",
        "color_hint": "beige, warm sand, natural linen",
    },
    "grey-modern": {
        "name": "高级灰纱帘",
        "prompt": "modern minimalist grey curtain, sleek sophisticated fabric, clean straight draping, contemporary urban style",
        "color_hint": "medium grey, charcoal grey",
    },
    "blush-pink": {
        "name": "裸粉色纱帘",
        "prompt": "soft blush pink sheer curtain, delicate romantic fabric, gentle flowing draping, warm feminine atmosphere",
        "color_hint": "blush pink, dusty rose",
    },
    "sage-green": {
        "name": "鼠尾草绿纱帘",
        "prompt": "sage green curtain, calming natural tone, soft matte fabric, relaxed organic draping, serene botanical feel",
        "color_hint": "sage green, muted olive",
    },
    "navy-stripe": {
        "name": "深蓝条纹纱帘",
        "prompt": "navy blue striped curtain, classic vertical stripe pattern, structured tailored draping, nautical elegant style",
        "color_hint": "navy blue, dark blue with white stripes",
    },
    "gold-jacquard": {
        "name": "金色提花纱帘",
        "prompt": "luxurious gold jacquard curtain, ornate damask pattern, rich heavy fabric, opulent classical European draping",
        "color_hint": "gold, champagne, antique brass",
    },
    "cream-embroidered": {
        "name": "奶白刺绣纱帘",
        "prompt": "cream colored curtain with delicate floral embroidery, fine needlework detail, soft romantic draping, refined elegance",
        "color_hint": "cream, off-white, ivory",
    },
}

CURTAIN_MODES = {
    "closed": "curtains fully closed covering the entire window, elegant gathered draping with vertical folds",
    "half": "curtains pulled to one side, half-open revealing the window view, tied back gracefully",
    "open": "curtains fully open and gathered neatly at both sides of the window frame, letting in full light",
}


def build_prompt(style_id: str, mode: str) -> str:
    """构建用于 SDXL img2img 的完整 prompt"""
    style = CURTAIN_STYLES.get(style_id, CURTAIN_STYLES["sheer-white"])
    mode_desc = CURTAIN_MODES.get(mode, CURTAIN_MODES["closed"])

    prompt = (
        f"Interior photograph of a real window with {style['prompt']}, "
        f"{mode_desc}, "
        f"photorealistic, professional interior design photography, "
        f"natural daylight, high resolution, sharp details, "
        f"the curtain colors are {style['color_hint']}, "
        f"realistic fabric texture and shadows, beautiful home interior"
    )
    return prompt


NEGATIVE_PROMPT = (
    "ugly, blurry, distorted, deformed, low quality, cartoon, anime, "
    "painting, illustration, drawing, unrealistic, artificial, "
    "oversaturated, overexposed, dark, grainy, noisy, "
    "bad anatomy, extra limbs, text, watermark, signature, "
    "distorted window frame, broken glass, messy room"
)


def resize_image_for_sdxl(image_bytes: bytes, max_size: int = 1024) -> bytes:
    """将图片缩放到 SDXL 友好的尺寸"""
    img = Image.open(BytesIO(image_bytes))
    img = img.convert("RGB")

    # 保持纵横比缩放到 max_size
    w, h = img.size
    if w > h:
        new_w = max_size
        new_h = int(h * max_size / w)
    else:
        new_h = max_size
        new_w = int(w * max_size / h)

    # SDXL 要求尺寸是 8 的倍数
    new_w = (new_w // 8) * 8
    new_h = (new_h // 8) * 8

    img = img.resize((new_w, new_h), Image.LANCZOS)

    buf = BytesIO()
    img.save(buf, format="PNG", quality=95)
    return buf.getvalue()


@app.get("/api/health")
async def health_check():
    """健康检查"""
    api_key = os.getenv("REPLICATE_API_TOKEN")
    return {
        "status": "ok",
        "replicate_configured": bool(api_key),
    }


@app.get("/api/styles")
async def get_styles():
    """返回所有可用的纱帘款式"""
    styles = []
    for sid, info in CURTAIN_STYLES.items():
        styles.append({"id": sid, "name": info["name"]})
    return {"styles": styles}


@app.post("/api/generate")
async def generate_curtain(
    image: UploadFile = File(...),
    style: str = Form(...),
    mode: str = Form("closed"),
):
    """
    核心接口：上传窗户照片 + 选择纱帘款式 → 返回 AI 生成的效果图
    """
    # ── 验证参数 ──
    if style not in CURTAIN_STYLES:
        raise HTTPException(400, f"未知的纱帘款式: {style}")
    if mode not in CURTAIN_MODES:
        raise HTTPException(400, f"未知的模式: {mode}")

    api_token = os.getenv("REPLICATE_API_TOKEN")
    if not api_token:
        raise HTTPException(500, "未配置 REPLICATE_API_TOKEN，请在 .env 文件中设置")

    try:
        # ── 1. 读取并预处理图片 ──
        content = await image.read()
        resized = resize_image_for_sdxl(content)

        # 保存上传原图
        file_id = str(uuid.uuid4())[:8]
        upload_path = UPLOAD_DIR / f"{file_id}_original.png"
        with open(upload_path, "wb") as f:
            f.write(resized)

        # ── 2. 转为 data URI 用于 Replicate ──
        b64 = base64.b64encode(resized).decode("utf-8")
        data_uri = f"data:image/png;base64,{b64}"

        # ── 3. 构建 Prompt ──
        prompt = build_prompt(style, mode)

        # ── 4. 调用 Replicate SDXL img2img ──
        print(f"[生成中] 款式={style}, 模式={mode}, 文件={file_id}")

        output = replicate.run(
            "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
            input={
                "image": data_uri,
                "prompt": prompt,
                "negative_prompt": NEGATIVE_PROMPT,
                "prompt_strength": 0.55,  # 控制 AI 改动程度 (0=不改, 1=完全重绘)
                "num_inference_steps": 30,
                "guidance_scale": 7.5,
                "scheduler": "K_EULER_ANCESTRAL",
                "width": 1024,
                "height": 1024,
                "num_outputs": 1,
            },
        )

        # ── 5. 下载结果图片 ──
        result_url = output[0] if isinstance(output, list) else str(output)

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(result_url)
            resp.raise_for_status()
            result_bytes = resp.content

        # 保存结果
        output_name = f"result_{file_id}.png"
        output_path = OUTPUT_DIR / output_name
        with open(output_path, "wb") as f:
            f.write(result_bytes)

        print(f"[完成] 结果已保存: {output_name}")

        return JSONResponse({
            "success": True,
            "result_url": f"/outputs/{output_name}",
            "original_url": f"/uploads/{file_id}_original.png",
            "style": style,
            "mode": mode,
        })

    except replicate.exceptions.ReplicateError as e:
        print(f"[Replicate 错误] {e}")
        return JSONResponse(
            {"success": False, "error": f"AI 模型调用失败: {str(e)}"},
            status_code=502,
        )
    except Exception as e:
        print(f"[服务器错误] {e}")
        return JSONResponse(
            {"success": False, "error": f"服务器错误: {str(e)}"},
            status_code=500,
        )


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  CurtainVision API 启动中...")
    print("  API 文档: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
