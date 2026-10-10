FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements-ml.txt ./requirements-ml.txt
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements-ml.txt
COPY app ./app
COPY scripts ./scripts
COPY data ./data
RUN useradd --create-home appuser && mkdir -p /app/models && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
