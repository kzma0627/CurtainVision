# -*- coding: utf-8 -*-
import os
import sys
import uuid
import httpx
import replicate
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding="utf-8")
# 确保从 main.py 所在目录或 CWD 加载 .env
_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")
load_dotenv()  # 也尝试 CWD

app = FastAPI(title="CurtainVision API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)

app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/resources", StaticFiles(directory="../resources/curtain"), name="resources")
app.mount("/windows", StaticFiles(directory="../resources/windows"), name="windows")

SERVER_BASE = "http://localhost:8000"
GITHUB_BASE = "https://raw.githubusercontent.com/kzma0627/CurtainVision/main/resources/curtain"
GITHUB_WINDOWS_BASE = "https://raw.githubusercontent.com/kzma0627/CurtainVision/main/resources/windows"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
WINDOWS_DIR = Path("../resources/windows")

AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
AIRTABLE_TABLE_ID = os.getenv("AIRTABLE_TABLE_ID", "Orders")

# ═══════════════════════════════════════════════════════
# 款式数据（与前端 FABRIC_CATEGORIES 对应）
# ═══════════════════════════════════════════════════════

CURTAIN_STYLES = {
    "sheerSolar1": {"name": "阳光纱 款式一", "refs": ["sheerSolar1-1.jpg"], "category": "sheerSolar"},
    "sheerSolar2": {"name": "阳光纱 款式二", "refs": ["sheerSolar2-1.jpg"], "category": "sheerSolar"},
    "sheerSolar3": {"name": "阳光纱 款式三", "refs": ["sheerSolar3-1.jpg"], "category": "sheerSolar"},
    "sheerPrivacy1": {"name": "隐私纱 款式一", "refs": ["sheerPrivacy1-1.png"], "category": "sheerPrivacy"},
    "sheerPrivacy2": {"name": "隐私纱 款式二", "refs": ["sheerPrivacy2-1.png"], "category": "sheerPrivacy"},
    "sheerDurable1": {"name": "耐用纱 款式一", "refs": ["sheerDurable1-1.png"], "category": "sheerDurable"},
}

# 面料类目 → 提示词描述
CATEGORY_PROMPTS = {
    "sheerSolar": "solar control sheer curtain fabric, light-filtering with UV protection, semi-transparent",
    "sheerPrivacy": "privacy sheer curtain fabric, translucent allowing light but blocking outside view",
    "sheerDurable": "durable sheer curtain fabric, sturdy weave, easy to clean, long-lasting material",
}

# 褶皱倍数 → 提示词描述
PLEAT_PROMPTS = {
    1.5: "The curtain has 1.5x pleat ratio with gentle minimal folds, creating a modern streamlined silhouette with less fabric volume.",
    2.0: "The curtain has standard 2x pleat ratio with balanced even pleats, creating a classic elegant drape with moderate fullness.",
    2.5: "The curtain has luxurious 2.5x pleat ratio with rich deep folds, creating dramatic full-bodied draping with abundant fabric volume.",
}

# 窗帘布置 → 提示词描述
ARRANGEMENT_PROMPTS = {
    "double": (
        "The curtains are arranged in a DOUBLE-OPENING style (split in the center). "
        "Two symmetrical curtain panels hang from the rod, meeting in the middle of the window. "
        "Each panel can be drawn to its respective side — left panel opens to the left, right panel opens to the right."
    ),
    "left": (
        "The curtain is arranged in a LEFT-OPENING style. "
        "A single curtain panel hangs from the rod and is positioned to open toward the LEFT side. "
        "The curtain fabric bunches and stacks on the LEFT side when drawn open."
    ),
    "right": (
        "The curtain is arranged in a RIGHT-OPENING style. "
        "A single curtain panel hangs from the rod and is positioned to open toward the RIGHT side. "
        "The curtain fabric bunches and stacks on the RIGHT side when drawn open."
    ),
}

# 长度类型 → 提示词描述（强化约束）
LENGTH_PROMPTS = {
    "floor": (
        "CRITICAL: The curtain MUST be floor-length. "
        "The curtain fabric hangs from the curtain rod at the top of the window and extends ALL THE WAY DOWN TO THE FLOOR. "
        "The bottom hem of the curtain touches or barely grazes the floor surface. "
        "The curtain covers the entire wall area from the rod to the floor, not just the window. "
        "Do NOT stop the curtain at the windowsill — it must reach the floor."
    ),
    "windowsill": (
        "CRITICAL: The curtain MUST be windowsill-length ONLY. "
        "The curtain fabric hangs from the curtain rod and stops exactly at the windowsill / bottom edge of the window frame. "
        "The bottom hem of the curtain is at the same height as the windowsill, NOT extending below it. "
        "There is visible wall space between the bottom of the curtain and the floor. "
        "The curtain does NOT reach the floor — it only covers the window area. "
        "Do NOT make the curtain floor-length."
    ),
}


def build_prompt(
    fabric_category: str = "sheerSolar",
    pleat_multiplier: float = 2.0,
    length_type: str = "floor",
    arrangement: str = "double",
) -> str:
    """构建生图提示词"""
    parts = [
        "You are an expert interior design renderer. Your task is to add sheer curtains to the window in the first photo, "
        "using the fabric shown in the reference images. Keep the room, walls, floor, furniture, and lighting exactly the same. "
        "Only add curtains — do not change anything else in the scene.",
    ]

    # 长度描述（最重要，放在最前面强调）
    length_desc = LENGTH_PROMPTS.get(length_type, LENGTH_PROMPTS["floor"])
    parts.append(length_desc)

    # 窗帘布置描述
    arrangement_desc = ARRANGEMENT_PROMPTS.get(arrangement, ARRANGEMENT_PROMPTS["double"])
    parts.append(arrangement_desc)

    # 面料描述
    cat_desc = CATEGORY_PROMPTS.get(fabric_category, CATEGORY_PROMPTS["sheerSolar"])
    parts.append(f"The curtain fabric type: {cat_desc}.")

    # 褶皱描述
    pleat_desc = PLEAT_PROMPTS.get(pleat_multiplier, PLEAT_PROMPTS[2.0])
    parts.append(pleat_desc)

    parts.append("Photorealistic interior design photography, natural soft lighting, high detail, 8k resolution.")

    return " ".join(parts)


@app.get("/api/health")
async def health_check():
    api_key = os.getenv("REPLICATE_API_TOKEN")
    return {"status": "ok", "replicate_configured": bool(api_key)}


@app.get("/api/styles")
async def get_styles():
    styles = []
    for sid, info in CURTAIN_STYLES.items():
        styles.append({
            "id": sid,
            "name": info["name"],
            "category": info["category"],
            "preview_url": SERVER_BASE + "/resources/" + info["preview"],
        })
    return {"styles": styles}


@app.get("/api/windows")
async def get_windows():
    windows = []
    if WINDOWS_DIR.exists():
        for f in sorted(WINDOWS_DIR.iterdir()):
            if f.suffix.lower() in IMAGE_EXTS:
                windows.append({
                    "filename": f.name,
                    "preview_url": SERVER_BASE + "/windows/" + f.name,
                    "github_url": GITHUB_WINDOWS_BASE + "/" + f.name,
                })
    return {"windows": windows}


@app.get("/api/debug/urls")
async def debug_urls(style: str = "1", window_url: str = ""):
    results = {}
    ref_urls = [GITHUB_BASE + "/" + ref for ref in CURTAIN_STYLES.get(style, CURTAIN_STYLES["1"])["refs"]]
    ref_checks = []
    async with httpx.AsyncClient(timeout=15) as client:
        for url in ref_urls:
            try:
                r = await client.head(url)
                ref_checks.append({"url": url, "status": r.status_code, "ok": r.status_code == 200})
            except Exception as e:
                ref_checks.append({"url": url, "ok": False, "error": str(e)})
    results["curtain_refs"] = ref_checks

    if window_url:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.head(window_url)
                results["window_url"] = {"url": window_url, "status": r.status_code, "ok": r.status_code == 200}
        except Exception as e:
            results["window_url"] = {"url": window_url, "ok": False, "error": str(e)}
    else:
        results["window_url"] = "未传入 window_url"

    all_images = ([window_url] if window_url else []) + ref_urls
    results["replicate_input_preview"] = {
        "model": "google/nano-banana",
        "image_input": all_images,
        "image_count": len(all_images),
    }
    all_ok = all(r["ok"] for r in ref_checks)
    if window_url:
        all_ok = all_ok and results["window_url"].get("ok", False)
    results["all_urls_ok"] = all_ok
    return results


@app.post("/api/debug/dry-run")
async def debug_dry_run(style: str = Form("1"), window_url: str = Form(...)):
    if style not in CURTAIN_STYLES:
        return {"error": "Unknown style"}
    ref_urls = [GITHUB_BASE + "/" + ref for ref in CURTAIN_STYLES[style]["refs"]]
    all_images = [window_url] + ref_urls
    url_checks = []
    async with httpx.AsyncClient(timeout=15) as client:
        for i, url in enumerate(all_images):
            label = "窗户照片" if i == 0 else f"窗帘参考图{i}"
            try:
                r = await client.head(url)
                url_checks.append({
                    "index": i, "label": label, "url": url,
                    "status": r.status_code, "ok": r.status_code == 200,
                    "content_type": r.headers.get("content-type", "unknown"),
                    "size_bytes": r.headers.get("content-length", "unknown"),
                })
            except Exception as e:
                url_checks.append({"index": i, "label": label, "url": url, "ok": False, "error": str(e)})
    all_ok = all(c["ok"] for c in url_checks)
    return {
        "dry_run": True,
        "style": style,
        "image_input": all_images,
        "url_checks": url_checks,
        "all_urls_accessible": all_ok,
    }


@app.post("/api/orders")
async def create_order(order: dict):
    """接收前端提交的订单配置，转发到 Airtable"""
    if not (AIRTABLE_API_KEY and AIRTABLE_BASE_ID and AIRTABLE_TABLE_ID):
        raise HTTPException(500, "Airtable 未正确配置")

    airtable_url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}"
    headers = {
        "Authorization": f"Bearer {AIRTABLE_API_KEY}",
        "Content-Type": "application/json",
    }

    window_photo = order.get("windowPhoto") or {}
    style = order.get("style") or {}
    config = order.get("config") or {}
    pricing = order.get("pricing") or {}

    fields = {
        "WindowFilename": window_photo.get("filename"),
        "WindowPreviewUrl": window_photo.get("previewUrl"),
        "WindowGithubUrl": window_photo.get("githubUrl"),
        "PhotoLabel": order.get("photoLabel", ""),
        "StyleId": style.get("id"),
        "StyleName": style.get("categoryName", ""),
        "PleatMultiplier": config.get("pleatMultiplier"),
        "LengthType": config.get("lengthType"),
        "ConfigWidth": config.get("width"),
        "ConfigHeight": config.get("height"),
        "Quantity": config.get("quantity"),
        "Notes": config.get("notes"),
        "BasePrice": pricing.get("basePrice"),
        "TotalPrice": pricing.get("totalPrice"),
        "Currency": pricing.get("currency") or "CNY",
        "ResultUrl": order.get("resultUrl"),
        "CreatedAt": order.get("createdAt"),
    }

    payload = {"records": [{"fields": fields}]}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(airtable_url, json=payload, headers=headers)
            resp.raise_for_status()
        data = resp.json()
        return {"success": True, "airtable": data}
    except httpx.HTTPStatusError as e:
        detail = f"Airtable 返回错误: {e.response.status_code} {e.response.text}"
        raise HTTPException(502, detail)
    except Exception as e:
        raise HTTPException(500, f"保存到 Airtable 失败: {e}")


@app.post("/api/generate")
async def generate_curtain(
    style: str = Form(...),
    window_url: str = Form(...),
    pleat_multiplier: float = Form(2.0),
    length_type: str = Form("floor"),
    fabric_category: str = Form("sheerSolar"),
    arrangement: str = Form("double"),
):
    if style not in CURTAIN_STYLES:
        raise HTTPException(400, "Unknown style: " + style)

    api_token = os.getenv("REPLICATE_API_TOKEN")
    if not api_token:
        raise HTTPException(500, "REPLICATE_API_TOKEN not configured")

    try:
        file_id = str(uuid.uuid4())[:8]
        ref_urls = [GITHUB_BASE + "/" + ref for ref in CURTAIN_STYLES[style]["refs"]]
        all_images = [window_url] + ref_urls

        prompt = build_prompt(
            fabric_category=fabric_category,
            pleat_multiplier=pleat_multiplier,
            length_type=length_type,
            arrangement=arrangement,
        )

        print(f"[Generating] style={style} cat={fabric_category} pleat={pleat_multiplier}x len={length_type} arr={arrangement}")
        print(f"[Prompt] {prompt}")

        output = replicate.run(
            "google/nano-banana",
            input={
                "prompt": prompt,
                "image_input": all_images,
            },
        )

        if hasattr(output, "url"):
            result_url = output.url
        elif hasattr(output, "__iter__") and not isinstance(output, str):
            result_url = list(output)[0]
            if hasattr(result_url, "url"):
                result_url = result_url.url
            else:
                result_url = str(result_url)
        else:
            result_url = str(output)

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.get(result_url)
            resp.raise_for_status()
            result_bytes = resp.content

        output_name = "result_" + file_id + ".png"
        output_path = OUTPUT_DIR / output_name
        with open(output_path, "wb") as f:
            f.write(result_bytes)

        print("[Done] " + output_name)

        return JSONResponse({
            "success": True,
            "result_url": "/outputs/" + output_name,
            "window_url": window_url,
            "style": style,
            "fabric_category": fabric_category,
            "pleat_multiplier": pleat_multiplier,
            "length_type": length_type,
            "arrangement": arrangement,
        })

    except HTTPException:
        raise
    except Exception as e:
        print("[Error] " + str(e))
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  CurtainVision API v2.0 starting...")
    print("  API docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
