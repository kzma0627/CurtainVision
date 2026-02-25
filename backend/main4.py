# -*- coding: utf-8 -*-
import os
import sys
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

sys.stdout.reconfigure(encoding="utf-8")
load_dotenv()

app = FastAPI(title="CurtainVision API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
RESOURCES_DIR = Path("../resources/curtain")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/resources", StaticFiles(directory="../resources/curtain"), name="resources")

SERVER_BASE = "http://localhost:8000"
GITHUB_BASE = "https://raw.githubusercontent.com/kzma0627/CurtainVision/main/resources/curtain"

CURTAIN_STYLES = {
    "1": {"name": "款式一", "preview": "1-3.jpg", "refs": ["1-1.jpg", "1-2.jpg", "1-3.jpg"]},
    "2": {"name": "款式二", "preview": "2-3.jpg", "refs": ["2-1.jpg", "2-2.jpg", "2-3.jpg"]},
    "3": {"name": "款式三", "preview": "3-3.jpg", "refs": ["3-1.jpg", "3-2.jpg", "3-3.jpg"]},
    "4": {"name": "款式四", "preview": "4-3.jpg", "refs": ["4-1.jpg", "4-2.jpg", "4-3.jpg"]},
    "5": {"name": "款式五", "preview": "5-3.jpg", "refs": ["5-1.jpg", "5-2.jpg", "5-3.jpg"]},
}


def image_to_data_uri(image_bytes: bytes, mime: str = "image/png") -> str:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime};base64,{b64}"


def file_to_data_uri(filepath: Path) -> str:
    suffix = filepath.suffix.lower()
    mime = "image/jpeg" if suffix in [".jpg", ".jpeg"] else "image/png"
    with open(filepath, "rb") as f:
        data = f.read()
    return image_to_data_uri(data, mime)


def resize_image(image_bytes: bytes, max_size: int = 1024) -> bytes:
    img = Image.open(BytesIO(image_bytes))
    img = img.convert("RGB")
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


@app.get("/api/health")
async def health_check():
    api_key = os.getenv("REPLICATE_API_TOKEN")
    return {"status": "ok", "replicate_configured": bool(api_key)}




@app.get("/api/test-refs/{style}")
async def test_refs(style: str):
    """测试参考图URL是否可访问"""
    import httpx
    if style not in CURTAIN_STYLES:
        return {"error": "Unknown style"}
    
    ref_urls = [GITHUB_BASE + "/" + ref for ref in CURTAIN_STYLES[style]["refs"]]
    results = []
    
    async with httpx.AsyncClient(timeout=10) as client:
        for url in ref_urls:
            try:
                resp = await client.head(url)
                results.append({
                    "url": url,
                    "status": resp.status_code,
                    "ok": resp.status_code == 200,
                    "content_type": resp.headers.get("content-type", "unknown"),
                    "size": resp.headers.get("content-length", "unknown"),
                })
            except Exception as e:
                results.append({"url": url, "status": "error", "ok": False, "error": str(e)})
    
    return {
        "style": style,
        "github_base": GITHUB_BASE,
        "refs": results,
        "all_ok": all(r["ok"] for r in results),
    }

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


@app.post("/api/generate")
async def generate_curtain(
    image: UploadFile = File(...),
    style: str = Form(...),
):
    if style not in CURTAIN_STYLES:
        raise HTTPException(400, "Unknown style: " + style)

    api_token = os.getenv("REPLICATE_API_TOKEN")
    if not api_token:
        raise HTTPException(500, "REPLICATE_API_TOKEN not configured")

    try:
        # 读取并压缩用户上传的窗户照片
        content = await image.read()
        resized = resize_image(content)

        # 保存原图备用
        file_id = str(uuid.uuid4())[:8]
        upload_name = file_id + "_window.png"
        upload_path = UPLOAD_DIR / upload_name
        with open(upload_path, "wb") as f:
            f.write(resized)

        # 把窗户照片上传到 Replicate Files API，拿到临时公开 URL
        async with httpx.AsyncClient(timeout=30) as upload_client:
            with open(upload_path, "rb") as f:
                upload_resp = await upload_client.post(
                    "https://api.replicate.com/v1/files",
                    headers={"Authorization": "Bearer " + api_token},
                    files={"content": ("window.png", f, "image/png")},
                )
            upload_resp.raise_for_status()
            window_url = upload_resp.json()["urls"]["get"]
            print("[Uploaded] window -> " + window_url)

        # 参考图使用 GitHub 公开 URL
        ref_urls = [
            GITHUB_BASE + "/" + ref
            for ref in CURTAIN_STYLES[style]["refs"]
        ]

        # 组合：窗户照片 URL + 参考图 URL，全部统一用 URL
        all_images = [window_url] + ref_urls

        prompt = (
            "Apply the curtains shown in the reference images to the window in the first photo. "
            "Keep the room, walls, floor, and furniture exactly the same. "
            "Only add the curtains naturally to the window. "
            "Photorealistic interior design photography, natural lighting, high quality."
        )

        print("[Generating] style=" + style + " file=" + file_id + " refs=" + str(len(ref_urls)))

        output = replicate.run(
            "google/nano-banana",
            input={
                "prompt": prompt,
                "image_input": all_images,
            },
        )

        # 获取结果
        if hasattr(output, 'url'):
            result_url = output.url
        elif hasattr(output, '__iter__') and not isinstance(output, str):
            result_url = list(output)[0]
            if hasattr(result_url, 'url'):
                result_url = result_url.url
            else:
                result_url = str(result_url)
        else:
            result_url = str(output)

        # 下载结果图片
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
            "original_url": "/uploads/" + upload_name,
            "style": style,
        })

    except Exception as e:
        print("[Error] " + str(e))
        return JSONResponse(
            {"success": False, "error": str(e)},
            status_code=500,
        )


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  CurtainVision API starting...")
    print("  API docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
