from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="Nova-Forest AI",
    version="0.1.0",
    description="Satellite-based forest fire risk analysis system"
)

app.include_router(router)


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "system": "Nova-Forest AI"
    }
