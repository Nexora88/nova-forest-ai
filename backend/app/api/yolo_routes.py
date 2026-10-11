"""API routes for real fire/smoke frame inference."""
from io import BytesIO

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from starlette.concurrency import run_in_threadpool

from app.engine.yolo_fire_detector import detect_image, model_status

router = APIRouter(prefix="/ml/yolo", tags=["YOLOv8 fire/smoke detection"])
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.get("/status")
def yolo_status():
    return model_status()


@router.post("/detect")
async def detect_frame(
    file: UploadFile = File(...),
    confidence: float = Query(0.25, ge=0.05, le=0.95),
):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Yalnızca JPEG, PNG veya WebP görüntüsü kabul edilir.")
    raw = await file.read(MAX_IMAGE_BYTES + 1)
    if not raw:
        raise HTTPException(status_code=400, detail="Görüntü dosyası boş.")
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Görüntü en fazla 8 MiB olabilir.")

    try:
        from PIL import Image, UnidentifiedImageError
        image = Image.open(BytesIO(raw))
        image.verify()
        image = Image.open(BytesIO(raw)).convert("RGB")
    except (ImportError, UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Görüntü çözümlenemedi veya geçersiz.") from exc

    if image.width <= 0 or image.height <= 0 or image.width * image.height > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=413, detail="Görüntü boyut sınırını aşıyor.")

    try:
        return await run_in_threadpool(detect_image, image, confidence)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"status": "model_unavailable", "message": str(exc)}) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail={"status": "inference_error", "message": "Model çıkarımı tamamlanamadı."}) from exc
    finally:
        await file.close()
