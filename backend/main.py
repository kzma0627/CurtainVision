# -*- coding: utf-8 -*-
import os
import sys
import io
import uuid
import httpx
import replicate
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, Form, File, UploadFile, Header, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from database import init_db
from auth import create_token, verify_token, get_or_create_user
from rate_limiter import check_guest_limit, check_user_limit, log_generation

sys.stdout.reconfigure(encoding="utf-8")
_backend_dir = Path(__file__).resolve().parent
load_dotenv(_backend_dir / ".env")
load_dotenv()

app = FastAPI(title="CurtainVision API", version="5.0.0")

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

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB

# ═══════════════════════════════════════════════════════
# Curtain styles
# ═══════════════════════════════════════════════════════

CURTAIN_STYLES = {
    "sheerSolar1": {"name": "Solar Sheer 1", "refs": ["sheerSolar1-1.jpg"], "category": "sheerSolar"},
    "sheerSolar2": {"name": "Solar Sheer 2", "refs": ["sheerSolar2-1.jpg"], "category": "sheerSolar"},
    "sheerSolar3": {"name": "Solar Sheer 3", "refs": ["sheerSolar3-1.jpg"], "category": "sheerSolar"},
    "sheerPrivacy1": {"name": "Privacy Sheer 1", "refs": ["sheerPrivacy1-1.png"], "category": "sheerPrivacy"},
    "sheerPrivacy2": {"name": "Privacy Sheer 2", "refs": ["sheerPrivacy2-1.png"], "category": "sheerPrivacy"},
    "sheerDurable1": {"name": "Durable Sheer 1", "refs": ["sheerDurable1-1.png"], "category": "sheerDurable"},
}

PLEAT_PROMPTS = {
    1.5: "1.5x fullness, minimal gentle folds.",
    2.0: "2x fullness, classic balanced pleats.",
    2.5: "2.5x fullness, rich deep dramatic folds.",
}

ARRANGEMENT_PROMPTS = {
    "double": "Two sheer panels split at center, each opens to its side.",
    "left": "Single sheer panel, gathered to the left.",
    "right": "Single sheer panel, gathered to the right.",
}

# Track + Length merged: the ONE critical visual constraint
LENGTH_PROMPTS = {
    "floor": (
        "CRITICAL — HANGING: A slim curtain rail sits at the window frame's top edge (not the ceiling, no decorative rod). "
        "The sheer hangs from this rail and extends all the way down to the floor. The hem touches the floor."
    ),
    "windowsill": (
        "CRITICAL — HANGING: A slim curtain rail sits at the window frame's top edge (not the ceiling, no decorative rod). "
        "The sheer hangs from this rail and ends exactly at the windowsill — the bottom ledge of the window. "
        "Bare wall is visible between the curtain hem and the floor."
    ),
}


def build_prompt(
    fabric_category: str = "sheerSolar",
    pleat_multiplier: float = 2.0,
    length_type: str = "floor",
    arrangement: str = "double",
) -> str:
    parts = [
        # Core instruction — concise, one paragraph
        "Add sheer curtains to the window in the first image. "
        "Match the exact fabric texture, color, and transparency from the reference image(s). "
        "Keep the same camera angle, room, walls, floor, furniture, and lighting. Only add the curtain.",
    ]
    # The ONE critical constraint: track position + length (merged)
    parts.append(LENGTH_PROMPTS.get(length_type, LENGTH_PROMPTS["floor"]))
    # Arrangement
    parts.append(ARRANGEMENT_PROMPTS.get(arrangement, ARRANGEMENT_PROMPTS["double"]))
    # Pleat fullness
    parts.append(PLEAT_PROMPTS.get(pleat_multiplier, PLEAT_PROMPTS[2.0]))
    # Quality
    parts.append("Photorealistic, natural light, 8k.")
    return " ".join(parts)


# ═══════════════════════════════════════════════════════
# Startup
# ═══════════════════════════════════════════════════════

@app.on_event("startup")
async def startup():
    init_db()


# ═══════════════════════════════════════════════════════
# Auth endpoints
# ═══════════════════════════════════════════════════════

@app.post("/api/auth/google")
async def auth_google(body: dict):
    credential = body.get("credential")
    if not credential:
        raise HTTPException(400, "Missing credential")

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}")
        if resp.status_code != 200:
            raise HTTPException(401, "Invalid Google token")
        info = resp.json()

    user_id = get_or_create_user(
        email=info["email"],
        name=info.get("name", ""),
        provider="google",
        provider_id=info["sub"],
        avatar_url=info.get("picture"),
    )
    token = create_token(user_id, info["email"])
    return {
        "token": token,
        "user": {"id": user_id, "email": info["email"], "name": info.get("name"), "avatar": info.get("picture")},
    }


@app.get("/api/auth/me")
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return {"user": None}
    payload = verify_token(authorization[7:])
    if not payload:
        return {"user": None}
    return {"user": {"id": int(payload["sub"]), "email": payload["email"]}}


# ═══════════════════════════════════════════════════════
# Rate limit
# ═══════════════════════════════════════════════════════

@app.get("/api/rate-limit/status")
async def rate_limit_status(request: Request, authorization: str = Header(None), guest_uuid: str = ""):
    ip = request.client.host if request.client else "127.0.0.1"
    if authorization and authorization.startswith("Bearer "):
        payload = verify_token(authorization[7:])
        if payload:
            return check_user_limit(int(payload["sub"]))
    return check_guest_limit(guest_uuid or "", ip)


# ═══════════════════════════════════════════════════════
# Core endpoints
# ═══════════════════════════════════════════════════════

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
            "preview_url": SERVER_BASE + "/resources/" + info["refs"][0],
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


# ═══════════════════════════════════════════════════════
# Orders (single item or batch)
# ═══════════════════════════════════════════════════════

def _build_airtable_record(item: dict) -> dict:
    window_photo = item.get("windowPhoto") or {}
    style = item.get("style") or {}
    config = item.get("config") or {}
    pricing = item.get("pricing") or {}
    return {
        "WindowFilename": window_photo.get("filename"),
        "WindowGithubUrl": window_photo.get("githubUrl"),
        "PhotoLabel": item.get("photoLabel", ""),
        "StyleId": style.get("id"),
        "StyleName": style.get("categoryName", ""),
        "PleatMultiplier": config.get("pleatMultiplier"),
        "LengthType": config.get("lengthType"),
        "Arrangement": config.get("arrangement"),
        "ConfigWidth": config.get("width"),
        "ConfigHeight": config.get("height"),
        "Quantity": config.get("quantity"),
        "RollerType": config.get("rollerType"),
        "Notes": config.get("notes"),
        "BasePrice": pricing.get("basePrice"),
        "TotalPrice": pricing.get("totalPrice"),
        "Currency": pricing.get("currency", "CHF"),
        "ResultUrl": item.get("resultUrl"),
        "CreatedAt": item.get("createdAt"),
    }


@app.post("/api/orders")
async def create_order(order: dict):
    if not (AIRTABLE_API_KEY and AIRTABLE_BASE_ID and AIRTABLE_TABLE_ID):
        raise HTTPException(500, "Airtable not configured")

    airtable_url = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}"
    headers = {"Authorization": f"Bearer {AIRTABLE_API_KEY}", "Content-Type": "application/json"}

    items = order.get("items")
    if items is None:
        items = [order]
    created_at = order.get("createdAt", "")

    records = []
    for item in items:
        if not item.get("createdAt"):
            item["createdAt"] = created_at
        records.append({"fields": _build_airtable_record(item)})

    all_results = []
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            for i in range(0, len(records), 10):
                batch = records[i : i + 10]
                resp = await client.post(airtable_url, json={"records": batch}, headers=headers)
                resp.raise_for_status()
                all_results.extend(resp.json().get("records", []))
        return {"success": True, "count": len(all_results)}
    except httpx.HTTPStatusError as e:
        raise HTTPException(502, f"Airtable error: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(500, f"Failed to save order: {e}")


# ═══════════════════════════════════════════════════════
# AI Generation (URL or file upload)
# ═══════════════════════════════════════════════════════

@app.post("/api/generate")
async def generate_curtain(
    request: Request,
    style: str = Form(...),
    window_url: Optional[str] = Form(None),
    window_file: Optional[UploadFile] = File(None),
    pleat_multiplier: float = Form(2.0),
    length_type: str = Form("floor"),
    fabric_category: str = Form("sheerSolar"),
    arrangement: str = Form("double"),
    guest_uuid: Optional[str] = Form(None),
    authorization: str = Header(None),
):
    if style not in CURTAIN_STYLES:
        raise HTTPException(400, "Unknown style: " + style)

    api_token = os.getenv("REPLICATE_API_TOKEN")
    if not api_token:
        raise HTTPException(500, "REPLICATE_API_TOKEN not configured")

    # Rate limit check
    ip = request.client.host if request.client else "127.0.0.1"
    user_id = None
    if authorization and authorization.startswith("Bearer "):
        payload = verify_token(authorization[7:])
        if payload:
            user_id = int(payload["sub"])
            limit_check = check_user_limit(user_id)
        else:
            limit_check = check_guest_limit(guest_uuid or "", ip)
    else:
        limit_check = check_guest_limit(guest_uuid or "", ip)

    if not limit_check["allowed"]:
        raise HTTPException(429, detail={
            "error": "rate_limit_exceeded",
            "message": "Generation limit reached",
            **limit_check,
        })

    try:
        file_id = str(uuid.uuid4())[:8]
        ref_urls = [GITHUB_BASE + "/" + ref for ref in CURTAIN_STYLES[style]["refs"]]

        # Determine window image source
        if window_file is not None and window_file.filename:
            contents = await window_file.read()
            if not contents:
                raise HTTPException(400, "Uploaded file is empty")
            if len(contents) > MAX_UPLOAD_SIZE:
                raise HTTPException(413, "File too large. Maximum 10MB.")
            window_image = io.BytesIO(contents)
            window_image.name = window_file.filename or "upload.png"
        elif window_url:
            window_image = window_url
        else:
            raise HTTPException(400, "Either window_url or window_file is required")

        all_images = [window_image] + ref_urls

        prompt = build_prompt(
            fabric_category=fabric_category,
            pleat_multiplier=pleat_multiplier,
            length_type=length_type,
            arrangement=arrangement,
        )

        print(f"[Generating] style={style} cat={fabric_category} pleat={pleat_multiplier}x len={length_type} arr={arrangement}")

        output = replicate.run(
            "google/nano-banana-pro",
            input={"prompt": prompt, "image_input": all_images},
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

        log_generation(user_id=user_id, guest_uuid=guest_uuid, ip=ip, style=style)
        print("[Done] " + output_name)

        return JSONResponse({
            "success": True,
            "result_url": "/outputs/" + output_name,
            "style": style,
            "fabric_category": fabric_category,
            "pleat_multiplier": pleat_multiplier,
            "length_type": length_type,
            "arrangement": arrangement,
        })

    except HTTPException:
        raise
    except replicate.exceptions.ModelError as me:
        pred = getattr(me, "prediction", None)
        error_msg = (pred.error if pred else None) or "Model returned an error"
        logs = (pred.logs if pred else "") or ""
        print("[ModelError] " + error_msg)
        if logs:
            print("[ModelError logs]\n" + logs)
        return JSONResponse({"success": False, "error": error_msg}, status_code=500)
    except Exception as e:
        import traceback
        print("[Error] " + str(e))
        print(traceback.format_exc())
        return JSONResponse({"success": False, "error": str(e) or type(e).__name__}, status_code=500)


# ═══════════════════════════════════════════════════════
# Debug
# ═══════════════════════════════════════════════════════

@app.get("/api/debug/urls")
async def debug_urls(style: str = "sheerSolar1", window_url: str = ""):
    style_data = CURTAIN_STYLES.get(style, CURTAIN_STYLES["sheerSolar1"])
    ref_urls = [GITHUB_BASE + "/" + ref for ref in style_data["refs"]]
    ref_checks = []
    async with httpx.AsyncClient(timeout=15) as client:
        for url in ref_urls:
            try:
                r = await client.head(url)
                ref_checks.append({"url": url, "status": r.status_code, "ok": r.status_code == 200})
            except Exception as e:
                ref_checks.append({"url": url, "ok": False, "error": str(e)})
    results = {"curtain_refs": ref_checks}
    if window_url:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                r = await client.head(window_url)
                results["window_url"] = {"url": window_url, "status": r.status_code, "ok": r.status_code == 200}
        except Exception as e:
            results["window_url"] = {"url": window_url, "ok": False, "error": str(e)}
    all_images = ([window_url] if window_url else []) + ref_urls
    results["replicate_input_preview"] = {"model": "google/nano-banana-pro", "image_input": all_images}
    all_ok = all(r["ok"] for r in ref_checks)
    if window_url:
        all_ok = all_ok and results.get("window_url", {}).get("ok", False)
    results["all_urls_ok"] = all_ok
    return results


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("  CurtainVision API v5.0 starting...")
    print("  API docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)
