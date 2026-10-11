"""Compatibility status route; inference is disabled until a compliant model exists."""
from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile
from app.engine.yolo_fire_detector import model_status

router = APIRouter(prefix="/ml/yolo", tags=["Experimental image analysis (disabled)"])
MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.get("/status")
def yolo_status():
    return model_status()


@router.post("/detect")
async def detect_frame(file: UploadFile = File(...)):
    # Validate and close the upload, but do not pretend a model is available.
    try:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=415, detail="Yalnızca JPEG, PNG veya WebP görüntüsü kabul edilir.")
        raw = await file.read(MAX_IMAGE_BYTES + 1)
        if not raw:
            raise HTTPException(status_code=400, detail="Görüntü dosyası boş.")
        if len(raw) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Görüntü en fazla 8 MiB olabilir.")
        raise HTTPException(
            status_code=503,
            detail={
                "status": "model_unavailable",
                "message": "Yangın/duman modeli lisans uyumluluğu için kaldırıldı; uyumlu ve doğrulanmış bir model seçilene kadar çıkarım kapalıdır.",
            },
        )
    finally:
        await file.close()
