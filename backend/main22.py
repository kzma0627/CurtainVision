# -*- coding: utf-8 -*-
import os
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUTF8"] = "1"

"""
CurtainVision MVP - Backend API (nano-banana-pro version)
Uses Replicate python SDK with google/nano-banana-pro.
"""

import uuid
import base64
from pathlib import Path
from io import BytesIO

import replicate
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CurtainVision API (nano-banana)", version="1.0.0")

# -- CORS --
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- File directories --
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# -- Curtain style prompt config --
CURTAIN_STYLES = {
    "sheer-white": {
        "name": "Sheer White",
        "prompt": "sheer white voile curtain, translucent lightweight fabric, soft diffused light filtering through, elegant minimal draping",
        "color_hint": "white, ivory",
    },
    "linen-beige": {
        "name": "Linen Beige",
        "prompt": "natural linen curtain in warm beige tone, organic textured woven fabric, casual elegant draping, cozy atmosphere",
        "color_hint": "beige, warm sand, natural linen",
    },
    "grey-modern": {
        "name": "Modern Grey",
        "prompt": "modern minimalist grey curtain, sleek sophisticated fabric, clean straight draping, contemporary urban style",
        "color_hint": "medium grey, charcoal grey",
    },
    "blush-pink": {
        "name": "Blush Pink",
        "prompt": "soft blush pink sheer curtain, delicate romantic fabric, gentle flowing draping, warm feminine atmosphere",
        "color_hint": "blush pink, dusty rose",
    },
    "sage-green": {
        "name": "Sage Green",
        "prompt": "sage green curtain, calming natural tone, soft matte fabric, relaxed organic draping, serene botanical feel",
        "color_hint": "sage green, muted olive",
    },
    "navy-stripe": {
        "name": "Navy Stripe",
        "prompt": "navy blue striped curtain, classic vertical stripe pattern, structured tailored draping, nautical elegant style",
        "color_hint": "navy blue, dark blue with white stripes",
    },
    "gold-jacquard": {
        "name": "Gold Jacquard",
        "prompt": "luxurious gold jacquard curtain, ornate damask pattern, rich heavy fabric, opulent classical European draping",
        "color_hint": "gold, champagne, antique brass",
    },
    "cream-embroidered": {
        "name": "Cream Embroidered",
        "prompt": "cream colored curtain with delicate floral embroidery, fine needlework detail, soft romantic draping, refined elegance",
        "color_hint": "cream, off-white, ivory",
    },
}

CURTAIN_MODES = {
    "closed": "curtains fully closed covering the entire window, elegant gathered draping with vertical folds",
    "half": "curtains pulled to one side, half-open revealing the window view, tied back gracefully",
    "open": "curtains fully open and gathered neatly at both sides of the window frame, letting in full light",
}

TIME_OF_DAY = {
    "day": "natural daylight coming through the window, soft realistic daytime interior lighting",
    "night": "evening scene with interior lights on, warm cozy indoor lighting, darker exterior through the window",
}


def build_prompt(style_id: str, mode: str, time_of_day: str) -> str:
    style = CURTAIN_STYLES.get(style_id, CURTAIN_STYLES["sheer-white"])
    mode_desc = CURTAIN_MODES.get(mode, CURTAIN_MODES["closed"])
    time_desc = TIME_OF_DAY.get(time_of_day, TIME_OF_DAY["day"])
    return (
        f"Interior photograph of a real window with {style['prompt']}, "
        f"{mode_desc}, "
        f"{time_desc}, "
        f"photorealistic, professional interior design photography, "
        f"high resolution, sharp details, "
        f"the curtain colors are {style['color_hint']}, "
        f"realistic fabric texture and shadows, beautiful home interior"
    )


def resize_image_for_sdxl(image_bytes: bytes, max_size: int = 1024) -> bytes:
    """依然对上传图做缩放和保存，用于前端展示原图；当前版本不把图片传给模型。"""
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    if w > h:
        new_w = max_size
        new_h = int(h * max_size / w)
    else:
        new_h = max_size
        new_w = int(w * max_size / h)
    new_w = (new_w // 8) * 8
    new_h = (new_h // 8) * 8
    img = img.resize((new_w, new_h), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="PNG", quality=95)
    return buf.getvalue()


# =====================================================
# API Endpoints
# =====================================================

@app.get("/api/health")
async def health_check():
    api_key = os.getenv("REPLICATE_API_TOKEN")
    return {
        "status": "ok",
        "replicate_configured": bool(api_key),
        "model": "google/nano-banana-pro",
    }


@app.get("/api/styles")
async def get_styles():
    styles = []
    for sid, info in CURTAIN_STYLES.items():
        styles.append({"id": sid, "name": info["name"]})
    return {"styles": styles}


def _basic_window_quality_check(image_bytes: bytes) -> bool:
    """
    Lightweight heuristic check:
    - Ensure minimum resolution
    - Ensure the image isn't extremely dark or low-contrast overall
    - Ensure the central area is brighter than the borders (very rough 'window' proxy)
    This is NOT perfect window detection, but helps avoid obviously unusable photos
    before sending them to the heavy generation model.
    """
    try:
        img = Image.open(BytesIO(image_bytes)).convert("L")
    except Exception:
        return False

    w, h = img.size
    # Minimum reasonable size（只挡住非常小的图）
    if w < 256 or h < 256:
        return False

    # Resize to small grid for quick statistics
    small = img.resize((128, 128))
    pixels = small.load()

    # Overall brightness & contrast
    vals = [pixels[x, y] for x in range(128) for y in range(128)]
    avg_brightness = sum(vals) / len(vals)
    variance = sum((v - avg_brightness) ** 2 for v in vals) / len(vals)

    # Too dark or too low-contrast -> likely unusable
    # 阈值放宽，只过滤极端情况
    if avg_brightness < 20 or variance < 80:
        return False

    # Central region vs border brightness
    cx0, cx1 = int(128 * 0.25), int(128 * 0.75)
    cy0, cy1 = int(128 * 0.25), int(128 * 0.75)

    center_vals = [
        pixels[x, y]
        for x in range(cx0, cx1)
        for y in range(cy0, cy1)
    ]
    border_vals = [
        pixels[x, y]
        for x in range(128)
        for y in range(128)
        if not (cx0 <= x < cx1 and cy0 <= y < cy1)
    ]

    center_avg = sum(center_vals) / len(center_vals)
    border_avg = sum(border_vals) / len(border_vals)

    # We expect the window area (roughly center) to be a bit brighter
    # 阈值放宽，避免误杀正常窗户照
    if center_avg < border_avg + 3:
        # 如果只是略微不亮，不再强制失败，直接放行
        return True

    return True


@app.post("/api/generate")
async def generate_curtain(
    image: UploadFile = File(...),
    style: str = Form(...),
    mode: str = Form("closed"),
    time_of_day: str = Form("day"),
):
    if style not in CURTAIN_STYLES:
        raise HTTPException(400, "Unknown curtain style: " + style)
    if mode not in CURTAIN_MODES:
        raise HTTPException(400, "Unknown mode: " + mode)
    if time_of_day not in TIME_OF_DAY:
        raise HTTPException(400, "Unknown time_of_day: " + time_of_day)

    api_token = os.getenv("REPLICATE_API_TOKEN")
    if not api_token:
        raise HTTPException(500, "REPLICATE_API_TOKEN not configured. Please set it in the .env file.")

    try:
        # 1. 读取并预处理上传图片（用于保存与前端展示，同时做一次基础质量/窗户检测）
        image.filename = uuid.uuid4().hex[:8] + ".png"
        content = await image.read()

        # 1.a 先做快速质量 / 窗户存在性检查，避免浪费生成模型调用
        if not _basic_window_quality_check(content):
            raise HTTPException(
                status_code=400,
                detail="Cannot find a clear window or image quality is too low. "
                "Please upload a brighter, front-facing window photo.",
            )

        resized = resize_image_for_sdxl(content)

        file_id = uuid.uuid4().hex[:8]
        upload_path = UPLOAD_DIR / (file_id + "_original.png")
        with open(upload_path, "wb") as f:
            f.write(resized)

        # 2. 组装 prompt（加入昼/夜场景）
        prompt = build_prompt(style, mode, time_of_day)

        # 3. 调用 nano-banana-pro 模型
        print("[Generating] style=" + style + ", mode=" + mode + ", file=" + file_id)

        output = replicate.run(
            "google/nano-banana-pro",
            input={
                "prompt": prompt,
                "aspect_ratio": "4:3",   # 你可以自己改成 "16:9" 等
                "output_format": "png",
            },
        )

        # 4. 保存结果图片到 outputs 目录
        output_name = "result_" + file_id + ".png"
        output_path = OUTPUT_DIR / output_name
        with open(output_path, "wb") as f:
            f.write(output.read())

        print("[Done] Saved: " + output_name)

        return JSONResponse(
            {
                "success": True,
                "result_url": "/outputs/" + output_name,
                "original_url": "/uploads/" + file_id + "_original.png",
                "style": style,
                "mode": mode,
            }
        )

    except Exception as e:
        print("[Server Error] " + str(e))
        return JSONResponse(
            {"success": False, "error": "Server error: " + str(e)},
            status_code=500,
        )


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  CurtainVision nano-banana API starting...")
    print("  API docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)