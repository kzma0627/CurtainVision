# -*- coding: utf-8 -*-
"""
CurtainVision - Debug Test Script
Run this to find exactly where the encoding error occurs.
Usage: python test_debug.py
"""
import os
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUTF8"] = "1"

import sys
import traceback
import uuid
import base64
from pathlib import Path
from io import BytesIO
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

IMAGE_PATH = r"D:\CurtainVision\photos\window.jpg"

print("=" * 60)
print("  CurtainVision Debug Test")
print("=" * 60)

# Step 1: Check API token
token = os.getenv("REPLICATE_API_TOKEN")
print(f"\n[1] API Token: {'OK (' + token[:8] + '...)' if token else 'MISSING!'}")
if not token:
    print("    Fix: check your .env file")
    sys.exit(1)

# Step 2: Read image
print(f"\n[2] Reading image: {IMAGE_PATH}")
try:
    with open(IMAGE_PATH, "rb") as f:
        raw = f.read()
    print(f"    OK - {len(raw)} bytes")
except Exception as e:
    print(f"    FAILED: {e}")
    sys.exit(1)

# Step 3: Resize
print(f"\n[3] Resizing image...")
try:
    img = Image.open(BytesIO(raw)).convert("RGB")
    w, h = img.size
    print(f"    Original: {w}x{h}")
    max_size = 1024
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
    img.save(buf, format="PNG")
    resized = buf.getvalue()
    print(f"    Resized: {new_w}x{new_h}, {len(resized)} bytes - OK")
except Exception as e:
    print(f"    FAILED: {e}")
    traceback.print_exc()
    sys.exit(1)

# Step 4: Base64 encode
print(f"\n[4] Base64 encoding...")
try:
    b64 = base64.b64encode(resized).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64}"
    print(f"    Data URI length: {len(data_uri)} chars - OK")
except Exception as e:
    print(f"    FAILED: {e}")
    traceback.print_exc()
    sys.exit(1)

# Step 5: Build prompt
print(f"\n[5] Building prompt...")
prompt = (
    "Interior photograph of a real window with sheer white voile curtain, "
    "translucent lightweight fabric, soft diffused light filtering through, "
    "curtains fully closed covering the entire window, "
    "photorealistic, professional interior design photography, "
    "natural daylight, high resolution, sharp details, "
    "realistic fabric texture and shadows, beautiful home interior"
)
negative = (
    "ugly, blurry, distorted, deformed, low quality, cartoon, anime, "
    "painting, illustration, drawing, unrealistic, watermark"
)
print(f"    Prompt length: {len(prompt)} chars - OK")

# Step 6: Call Replicate
print(f"\n[6] Calling Replicate API...")
print(f"    This may take 30-60 seconds on first run (cold start)...")
try:
    import replicate

    output = replicate.run(
        "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
        input={
            "image": data_uri,
            "prompt": prompt,
            "negative_prompt": negative,
            "prompt_strength": 0.55,
            "num_inference_steps": 30,
            "guidance_scale": 7.5,
            "scheduler": "K_EULER_ANCESTRAL",
            "width": 1024,
            "height": 1024,
            "num_outputs": 1,
        },
    )

    result_url = output[0] if isinstance(output, list) else str(output)
    print(f"    SUCCESS! Result URL: {result_url}")

except Exception as e:
    print(f"    FAILED at Replicate call!")
    print(f"    Error type: {type(e).__name__}")
    print(f"    Error message: {e}")
    print(f"\n    Full traceback:")
    traceback.print_exc()
    sys.exit(1)

# Step 7: Download result
print(f"\n[7] Downloading result...")
try:
    import httpx
    with httpx.Client(timeout=60) as client:
        resp = client.get(result_url)
        resp.raise_for_status()
        result_bytes = resp.content

    out_path = Path("test_result.png")
    with open(out_path, "wb") as f:
        f.write(result_bytes)
    print(f"    Saved to {out_path.absolute()} ({len(result_bytes)} bytes) - OK")
except Exception as e:
    print(f"    FAILED: {e}")
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("  ALL STEPS PASSED! Everything works.")
print("  If the main server still fails, the issue is in FastAPI/uvicorn.")
print("=" * 60)
