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
load_dotenv()

app = FastAPI(title="CurtainVision API", version="1.0.0")

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

CURTAIN_STYLES = {
    "1": {"name": "款式一", "preview": "1-3.jpg", "refs": ["1-3.jpg"]},
    "2": {"name": "款式二", "preview": "2-3.jpg", "refs": ["2-3.jpg"]},
    "3": {"name": "款式三", "preview": "3-3.jpg", "refs": ["3-3.jpg"]},
    "4": {"name": "款式四", "preview": "4-3.jpg", "refs": ["4-3.jpg"]},
    "5": {"name": "款式五", "preview": "5-3.jpg", "refs": ["5-3.jpg"]},
}


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
        results["window_url"] = "未传入 window_url，用法: ?window_url=https://..."

    all_images = ([window_url] if window_url else ["<请传入window_url>"]) + ref_urls
    results["replicate_input_preview"] = {
        "model": "google/nano-banana",
        "image_input": all_images,
        "image_count": len(all_images),
        "note": "第1张=窗户照片，后3张=窗帘参考图",
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
        "conclusion": "✅ 参数正常，可以调用Replicate" if all_ok else "❌ 有URL无法访问",
    }


@app.post("/api/orders")
async def create_order(order: dict):
    """
    接收前端提交的订单配置，并转发到 Airtable。

    需要在 .env 中配置：
      - AIRTABLE_API_KEY
      - AIRTABLE_BASE_ID
      - AIRTABLE_TABLE_ID（表名或表 ID，默认为 Orders）
    """
    if not (AIRTABLE_API_KEY and AIRTABLE_BASE_ID and AIRTABLE_TABLE_ID):
        raise HTTPException(500, "Airtable 未正确配置，请检查环境变量：AIRTABLE_API_KEY / AIRTABLE_BASE_ID / AIRTABLE_TABLE_ID")

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
        "StyleId": style.get("id"),
        "StyleName": style.get("name"),
        "ConfigWidth": config.get("width"),
        "ConfigHeight": config.get("height"),
        "Quantity": config.get("quantity"),
        "Room": config.get("room"),
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

        prompt = (
            "Apply the curtains shown in the reference images to the window in the first photo. "
            "Keep the room, walls, floor, and furniture exactly the same. "
            "Only add the curtains naturally to the window. "
            "Photorealistic interior design photography, natural lighting, high quality."
        )

        print(f"[Generating] style={style} file={file_id} window={window_url}")

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
        })

    except HTTPException:
        raise
    except Exception as e:
        print("[Error] " + str(e))
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  CurtainVision API starting...")
    print("  API docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
