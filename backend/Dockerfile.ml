FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
# OpenCV's Linux wheel needs these shared libraries in the slim image.
RUN apt-get update && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libxcb1 libx11-6 libxext6 libxrender1 libsm6 libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements-ml.txt ./requirements-ml.txt
COPY requirements.txt ./requirements.txt
# Install CPU-only PyTorch first so pip does not pull multi-gigabyte CUDA runtime wheels.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch torchvision && pip install --no-cache-dir -r requirements-ml.txt
COPY app ./app
COPY scripts ./scripts
COPY data ./data
RUN useradd --create-home appuser && mkdir -p /app/models && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
