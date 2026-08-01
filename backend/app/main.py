from fastapi import FastAPI
from app.api.routes import router
from app.api.weather_routes import router as weather_router
from app.api.satellite_routes import router as satellite_router
from app.api.ndvi_routes import router as ndvi_router

app = FastAPI(
    title="Nova-Forest AI",
    version="0.1.0",
    description="Satellite-based forest fire risk analysis system"
)

app.include_router(router)
app.include_router(weather_router)
app.include_router(satellite_router)
app.include_router(ndvi_router)


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "system": "Nova-Forest AI"
    }
